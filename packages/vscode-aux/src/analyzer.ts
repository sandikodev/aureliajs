import ts from 'typescript';
import type {
  AuxDocumentAnalysis,
  ScriptAnalysis,
  TemplateAnalysis,
  TemplateBinding,
  TemplateInterpolation,
  ViewModelMember,
} from './types.js';
import { parseAuxBlocks } from './parser.js';

/**
 * Analyzes an .aux file document: parses script block with TypeScript AST
 * and extracts all bindings and interpolations from the template.
 */
export function analyzeAuxDocument(content: string): AuxDocumentAnalysis {
  const blocks = parseAuxBlocks(content);

  const scriptAnalysis = analyzeScript(blocks.script?.content ?? '', blocks.script?.startOffset ?? 0);
  const templateAnalysis = analyzeTemplate(blocks.template?.content ?? '', blocks.template?.startOffset ?? 0);

  return {
    script: scriptAnalysis,
    template: templateAnalysis,
  };
}

/**
 * Analyzes the TypeScript code in the <script> block using the TypeScript Compiler API.
 */
function analyzeScript(scriptContent: string, startOffset: number): ScriptAnalysis {
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
