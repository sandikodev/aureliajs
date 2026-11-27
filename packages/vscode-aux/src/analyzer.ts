import ts from 'typescript';
import type {
  AuxDocumentAnalysis,
  ScriptAnalysis,
  TemplateAnalysis,
  TemplateBinding,
  TemplateInterpolation,
  ViewModelMember,
} from './types';
import { parseAuxBlocks } from './parser';

/**
 * Analyzes an .aux file document: parses script block with TypeScript AST
 * and extracts all bindings and interpolations from the template.
 */
export function analyzeAuxDocument(content: string): AuxDocumentAnalysis {
  const blocks = parseAuxBlocks(content);

  let scriptAnalysis: ScriptAnalysis;
  if (blocks.script?.content.trim()) {
    scriptAnalysis = analyzeClassScript(blocks.script.content, blocks.script.startOffset);
    if (blocks.setupScript?.content.trim()) {
      const setup = analyzeSetupScript(blocks.setupScript.content, blocks.setupScript.startOffset);
      for (const [name, member] of setup.members) {
        scriptAnalysis.members.set(name, member);
      }
    }
  } else if (blocks.setupScript?.content.trim()) {
    scriptAnalysis = analyzeSetupScript(blocks.setupScript.content, blocks.setupScript.startOffset);
  } else {
    scriptAnalysis = {
      className: 'Component',
      members: new Map(),
      scriptStartOffset: blocks.script?.startOffset ?? blocks.setupScript?.startOffset ?? 0,
      scriptEndOffset: blocks.script?.endOffset ?? blocks.setupScript?.endOffset ?? 0,
      hasScript: false,
    };
  }

  if (blocks.serverScript?.content.trim()) {
    augmentWithServerLoaderMembers(
      scriptAnalysis.members,
      blocks.serverScript.content,
      blocks.serverScript.startOffset
    );
  }

  const templateAnalysis = analyzeTemplate(
    blocks.template?.content ?? '',
    blocks.template?.startOffset ?? 0
  );

  return {
    script: scriptAnalysis,
    template: templateAnalysis,
  };
}

/**
 * Analyzes standard class-based TypeScript code in `<script>` using the TypeScript Compiler API.
 */
function analyzeClassScript(scriptContent: string, startOffset: number): ScriptAnalysis {
  const members = new Map<string, ViewModelMember>();
  let className = 'Component';
  let hasScript = Boolean(scriptContent.trim());

  if (!hasScript) {
    return {
      className,
      members,
      scriptStartOffset: startOffset,
      scriptEndOffset: startOffset,
      hasScript: false,
    };
  }

  const sourceFile = ts.createSourceFile(
    'component.ts',
    scriptContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      if (node.name) {
        className = node.name.text;
      }

      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const isBindable = hasBindableDecorator(member);
          const typeString = member.type ? member.type.getText(sourceFile) : inferTypeFromInitializer(member.initializer, sourceFile);
          const offset = startOffset + member.name.getStart(sourceFile);
          const length = member.name.getWidth(sourceFile);
          const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, member.name.getStart(sourceFile));

          members.set(name, {
            name,
            kind: 'property',
            typeString,
            isBindable,
            offset,
            length,
            line,
            column: character,
          });
        } else if (ts.isGetAccessorDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const typeString = member.type ? member.type.getText(sourceFile) : 'unknown';
          const offset = startOffset + member.name.getStart(sourceFile);
          const length = member.name.getWidth(sourceFile);
          const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, member.name.getStart(sourceFile));

          members.set(name, {
            name,
            kind: 'getter',
            typeString,
            isBindable: false,
            offset,
            length,
            line,
            column: character,
          });
        } else if (ts.isMethodDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const returnType = member.type ? member.type.getText(sourceFile) : 'void';
          const params = member.parameters.map((p) => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : 'any',
          }));
          const typeString = `(${params.map((p) => `${p.name}: ${p.type}`).join(', ')}) => ${returnType}`;
          const offset = startOffset + member.name.getStart(sourceFile);
          const length = member.name.getWidth(sourceFile);
          const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, member.name.getStart(sourceFile));

          members.set(name, {
            name,
            kind: 'method',
            typeString,
            isBindable: false,
            parameters: params,
            offset,
            length,
            line,
            column: character,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    className,
    members,
    scriptStartOffset: startOffset,
    scriptEndOffset: startOffset + scriptContent.length,
    hasScript: true,
  };
}

/**
 * Analyzes `<script setup>` top-level bindings (`let` -> bindable props unless `_`-prefixed,
 * `const` -> internal properties/methods, `function` -> methods, `defineProps<...>()` / `defineProps([...])`).
 */
function analyzeSetupScript(setupContent: string, startOffset: number): ScriptAnalysis {
  const members = new Map<string, ViewModelMember>();
  const sourceFile = ts.createSourceFile(
    'setup.ts',
    setupContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  for (const stmt of sourceFile.statements) {
    if (ts.isVariableStatement(stmt)) {
      const isLet = (stmt.declarationList.flags & ts.NodeFlags.Let) !== 0;
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const name = decl.name.text;
        const pos = decl.name.getStart(sourceFile);
        const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);

        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          const fn = decl.initializer;
          const returnType = fn.type ? fn.type.getText(sourceFile) : 'unknown';
          const params = fn.parameters.map((p) => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : 'any',
          }));
          members.set(name, {
            name,
            kind: 'method',
            typeString: `(${params.map((p) => `${p.name}: ${p.type}`).join(', ')}) => ${returnType}`,
            isBindable: false,
            parameters: params,
            offset: startOffset + pos,
            length: decl.name.getWidth(sourceFile),
            line,
            column: character,
          });
          continue;
        }

        const typeString = decl.type
          ? decl.type.getText(sourceFile)
          : inferTypeFromInitializer(decl.initializer, sourceFile);

        members.set(name, {
          name,
          kind: 'property',
          typeString,
          isBindable: isLet && !name.startsWith('_'),
          offset: startOffset + pos,
          length: decl.name.getWidth(sourceFile),
          line,
          column: character,
        });
      }
      continue;
    }

    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      const name = stmt.name.text;
      const pos = stmt.name.getStart(sourceFile);
      const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
      const returnType = stmt.type ? stmt.type.getText(sourceFile) : 'void';
      const params = stmt.parameters.map((p) => ({
        name: p.name.getText(sourceFile),
        type: p.type ? p.type.getText(sourceFile) : 'any',
      }));
      members.set(name, {
        name,
        kind: 'method',
        typeString: `(${params.map((p) => `${p.name}: ${p.type}`).join(', ')}) => ${returnType}`,
        isBindable: false,
        parameters: params,
        offset: startOffset + pos,
        length: stmt.name.getWidth(sourceFile),
        line,
        column: character,
      });
      continue;
    }

    if (
      ts.isExpressionStatement(stmt) &&
      ts.isCallExpression(stmt.expression) &&
      ts.isIdentifier(stmt.expression.expression) &&
      stmt.expression.expression.text === 'defineProps'
    ) {
      const call = stmt.expression;
      if (call.typeArguments && call.typeArguments[0] && ts.isTypeLiteralNode(call.typeArguments[0])) {
        for (const prop of call.typeArguments[0].members) {
          if (ts.isPropertySignature(prop) && prop.name) {
            const name = prop.name.getText(sourceFile);
            const pos = prop.name.getStart(sourceFile);
            const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
            members.set(name, {
              name,
              kind: 'property',
              typeString: prop.type ? prop.type.getText(sourceFile) : 'unknown',
              isBindable: true,
              offset: startOffset + pos,
              length: prop.name.getWidth(sourceFile),
              line,
              column: character,
            });
          }
        }
      } else if (call.arguments[0] && ts.isArrayLiteralExpression(call.arguments[0])) {
        for (const el of call.arguments[0].elements) {
          if (ts.isStringLiteral(el)) {
            const name = el.text;
            const pos = el.getStart(sourceFile);
            const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
            members.set(name, {
              name,
              kind: 'property',
              typeString: 'unknown',
              isBindable: true,
              offset: startOffset + pos,
              length: el.getWidth(sourceFile),
              line,
              column: character,
            });
          }
        }
      }
    }
  }

  return {
    className: 'SetupComponent',
    members,
    scriptStartOffset: startOffset,
    scriptEndOffset: startOffset + setupContent.length,
    hasScript: Boolean(setupContent.trim()),
  };
}

/**
 * Extracts returned property names/types from `export async function loader(...)` inside `<script server>`
 * so template bindings to server-hydrated fields receive IDE completions and avoid false lint warnings.
 */
function augmentWithServerLoaderMembers(
  members: Map<string, ViewModelMember>,
  serverContent: string,
  startOffset: number
): void {
  const sourceFile = ts.createSourceFile(
    'server.ts',
    serverContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  for (const stmt of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(stmt) || stmt.name?.text !== 'loader' || !stmt.body) {
      continue;
    }

    const visitReturn = (node: ts.Node) => {
      if (ts.isFunctionLike(node) && node !== stmt) return;
      if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
        for (const prop of node.expression.properties) {
          if (ts.isPropertyAssignment(prop) && prop.name) {
            const name = prop.name.getText(sourceFile);
            if (!members.has(name) || members.get(name)?.typeString === 'any' || members.get(name)?.typeString === 'null') {
              const pos = prop.name.getStart(sourceFile);
              const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
              members.set(name, {
                name,
                kind: 'property',
                typeString: inferTypeFromInitializer(prop.initializer, sourceFile),
                isBindable: true,
                offset: startOffset + pos,
                length: prop.name.getWidth(sourceFile),
                line,
                column: character,
              });
            }
          } else if (ts.isShorthandPropertyAssignment(prop)) {
            const name = prop.name.text;
            if (!members.has(name) || members.get(name)?.typeString === 'any' || members.get(name)?.typeString === 'null') {
              const pos = prop.name.getStart(sourceFile);
              const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
              members.set(name, {
                name,
                kind: 'property',
                typeString: 'unknown',
                isBindable: true,
                offset: startOffset + pos,
                length: prop.name.getWidth(sourceFile),
                line,
                column: character,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visitReturn);
    };

    visitReturn(stmt.body);
  }
}

function hasBindableDecorator(node: ts.PropertyDeclaration): boolean {
  if (!node.modifiers) return false;
  return node.modifiers.some((mod) => {
    if (ts.isDecorator(mod)) {
      const expr = mod.expression;
      if (ts.isIdentifier(expr) && expr.text === 'bindable') return true;
      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'bindable') return true;
    }
    return false;
  });
}

function inferTypeFromInitializer(init: ts.Expression | undefined, sourceFile: ts.SourceFile): string {
  if (!init) return 'any';
  if (ts.isStringLiteral(init)) return 'string';
  if (ts.isNumericLiteral(init)) return 'number';
  if (init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
  if (ts.isArrayLiteralExpression(init)) return 'any[]';
  return init.getText(sourceFile);
}

/**
 * Analyzes the HTML inside the <template> block to locate Aurelia bindings and interpolations.
 */
function analyzeTemplate(templateContent: string, startOffset: number): TemplateAnalysis {
  const bindings: TemplateBinding[] = [];
  const interpolations: TemplateInterpolation[] = [];

  // Match HTML tags: <tag attr="val" ...>
  const tagRegex = /<([a-zA-Z0-9_-]+)\b([^>]*)>/g;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(templateContent)) !== null) {
    const tagName = tagMatch[1] ?? '';
    const attrsStr = tagMatch[2] ?? '';
    const tagAttrsStart = tagMatch.index + 1 + tagName.length;

    // Parse attributes inside this tag
    // Match name="value", name='value', name=value, or name
    const attrRegex = /([a-zA-Z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      const fullAttrName = attrMatch[1];
      if (!fullAttrName) continue;

      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      const dotIndex = fullAttrName.indexOf('.');

      if (dotIndex > 0) {
        const targetAttr = fullAttrName.slice(0, dotIndex);
        const command = fullAttrName.slice(dotIndex + 1);

        const attrNameStart = startOffset + tagAttrsStart + attrMatch.index;
        const attrNameEnd = attrNameStart + fullAttrName.length;

        // Find value range if present
        let valStart = attrNameEnd;
        let valEnd = attrNameEnd;
        if (attrMatch[0].includes('=')) {
          const eqIdx = attrMatch[0].indexOf('=');
          const afterEq = attrMatch[0].slice(eqIdx + 1);
          const quoteMatch = /(["'])(.*?)\1/.exec(afterEq);
          if (quoteMatch) {
            valStart = startOffset + tagAttrsStart + attrMatch.index + eqIdx + 1 + quoteMatch.index + 1;
            valEnd = valStart + quoteMatch[2]!.length;
          }
        }

        bindings.push({
          targetAttribute: targetAttr,
          command,
          expression: attrVal,
          fullAttributeName: fullAttrName,
          nameRange: { start: attrNameStart, end: attrNameEnd },
          valueRange: { start: valStart, end: valEnd },
          elementTagName: tagName,
        });
      }
    }
  }

  // Match all ${...} interpolations in the template
  const interpRegex = /\$\{([^}]+)\}/g;
  let interpMatch: RegExpExecArray | null;

  while ((interpMatch = interpRegex.exec(templateContent)) !== null) {
    const expr = interpMatch[1] ?? '';
    const exprStart = startOffset + interpMatch.index + 2; // skip '${'
    const exprEnd = exprStart + expr.length;

    interpolations.push({
      expression: expr,
      range: { start: exprStart, end: exprEnd },
    });
  }

  return {
    bindings,
    interpolations,
    templateStartOffset: startOffset,
    templateEndOffset: startOffset + templateContent.length,
    rawHtml: templateContent,
  };
}
