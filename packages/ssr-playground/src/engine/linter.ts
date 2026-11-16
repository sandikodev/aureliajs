/**
 * @aureliajs/ssr-playground
 * Real Aurelia 2 & .aux SFC Linter Engine
 * Inspired by and aligned with packages/vscode-aux
 */

import ts from 'typescript';

export interface LintDiagnostic {
  file: string;
  line: number;
  col: number;
  length: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: string;
}

const AURELIA_COMMANDS = new Set([
  'bind',
  'trigger',
  'capture',
  'two-way',
  'to-view',
  'from-view',
  'one-time',
  'for',
  'attr',
  'class',
  'style',
]);

const AURELIA_DIRECTIVES = new Set([
  'if.bind',
  'else',
  'repeat.for',
  'switch.bind',
  'case',
  'default-case',
  'promise.bind',
  'portal',
  'ref',
  'containerless',
  'as-custom-element',
]);

const AURELIA_CONTEXT_VARIABLES = new Set([
  '$event',
  '$this',
  '$parent',
  '$index',
  '$first',
  '$last',
  '$even',
  '$odd',
]);

const GLOBAL_IDENTIFIERS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  'this',
  'window',
  'document',
  'Math',
  'JSON',
  'Date',
  'console',
  'Array',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Error',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
]);

interface ViewModelAnalysis {
  className: string;
  members: Set<string>;
}

function analyzeTypeScriptCode(code: string): ViewModelAnalysis {
  const members = new Set<string>();
  let className = 'AureliaComponent';

  if (!code.trim()) {
    return { className, members };
  }

  const sourceFile = ts.createSourceFile('component.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      if (node.name) className = node.name.text;
      for (const m of node.members) {
        if (ts.isPropertyDeclaration(m) && m.name) {
          members.add(m.name.getText(sourceFile));
        } else if (ts.isMethodDeclaration(m) && m.name) {
          members.add(m.name.getText(sourceFile));
        } else if (ts.isGetAccessorDeclaration(m) && m.name) {
          members.add(m.name.getText(sourceFile));
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { className, members };
}

function getLineAndCol(text: string, offset: number): { line: number; col: number } {
  const prefix = text.slice(0, Math.max(0, offset));
  const lines = prefix.split('\n');
  const line = lines.length;
  const col = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { line, col };
}

export function lintAureliaFiles(files: Record<string, string>): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const fileKeys = Object.keys(files);

  const auxFile = fileKeys.find((f) => f.endsWith('.aux'));
  const htmlFile = fileKeys.find((f) => f.endsWith('.html'));
  const tsFile = fileKeys.find((f) => f.endsWith('.ts'));

  // ----------------------------------------------------
  // CASE 1: Single-File Component (.aux)
  // ----------------------------------------------------
  if (auxFile && files[auxFile]) {
    const content = files[auxFile] ?? '';
    const templateMatch = content.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
    const scriptMatch = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);

    const scriptCode = scriptMatch && scriptMatch[1] ? scriptMatch[1] : '';
    const templateCode = templateMatch && templateMatch[1] ? templateMatch[1] : content;
    const templateOffset = templateMatch && templateMatch.index ? templateMatch.index + (templateMatch[0]?.indexOf('>') ?? 0) + 1 : 0;

    const vm = analyzeTypeScriptCode(scriptCode);
    lintTemplate(templateCode, templateOffset, auxFile, vm, content, diagnostics);
    return diagnostics;
  }

  // ----------------------------------------------------
  // CASE 2: Paired Convention (.html + .ts)
  // ----------------------------------------------------
  if (htmlFile && files[htmlFile]) {
    const htmlCode = files[htmlFile] ?? '';
    const tsCode = tsFile && files[tsFile] ? files[tsFile] : '';
    const vm = analyzeTypeScriptCode(tsCode);
    lintTemplate(htmlCode, 0, htmlFile, vm, htmlCode, diagnostics);
  }

  return diagnostics;
}

function lintTemplate(
  templateHtml: string,
  baseOffset: number,
  filename: string,
  vm: ViewModelAnalysis,
  fullFileContent: string,
  diagnostics: LintDiagnostic[]
): void {
  const scopedVars = new Set<string>();

  // Pass 1: Parse repeat.for bindings to collect scoped loop variables
  const attrRegex = /([a-zA-Z0-9_$-]+(?:\.[a-zA-Z0-9_$-]+)?)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(templateHtml)) !== null) {
    const attrName = match[1] ?? '';
    const attrValue = match[2] ?? match[3] ?? '';
    const matchOffset = baseOffset + match.index;

    if (attrName === 'repeat.for' || attrName.endsWith('.for')) {
      const repeatMatch = /^\s*([a-zA-Z0-9_$]+)\s+of\s+(.+)$/.exec(attrValue);
      if (repeatMatch && repeatMatch[1]) {
        scopedVars.add(repeatMatch[1]);
      } else {
        const { line, col } = getLineAndCol(fullFileContent, matchOffset);
        diagnostics.push({
          file: filename,
          line,
          col,
          length: attrName.length + attrValue.length + 3,
          message: `Invalid repeat expression. Expected 'item of items' syntax, but received: "${attrValue}"`,
          severity: 'error',
          source: 'Aurelia AUX',
        });
      }
    }
  }

  // Pass 2: Validate binding commands and expressions
  attrRegex.lastIndex = 0;
  while ((match = attrRegex.exec(templateHtml)) !== null) {
    const attrName = match[1] ?? '';
    const attrValue = match[2] ?? match[3] ?? '';
    const matchOffset = baseOffset + match.index;

    if (!attrName.includes('.')) {
      continue;
    }

    const [, ...commandParts] = attrName.split('.');
    const command = commandParts.join('.');

    // Check unknown binding command
    if (!AURELIA_COMMANDS.has(command) && !AURELIA_DIRECTIVES.has(attrName)) {
      const dotIdx = attrName.indexOf('.');
      const { line, col } = getLineAndCol(fullFileContent, matchOffset + dotIdx);
      diagnostics.push({
        file: filename,
        line,
        col,
        length: command.length + 1,
        message: `Unknown Aurelia binding command '.${command}'. Did you mean '.bind' or '.trigger'?`,
        severity: 'warning',
        source: 'Aurelia AUX',
      });
      continue;
    }

    if (vm.members.size === 0) continue;

    // Check event handler method calls: click.trigger="increment()"
    if (command === 'trigger' || command === 'capture') {
      const methodMatch = /^([a-zA-Z0-9_$]+)(?:\s*\((.*)\))?/.exec(attrValue.trim());
      if (methodMatch && methodMatch[1]) {
        const methodName = methodMatch[1];
        if (
          !vm.members.has(methodName) &&
          !scopedVars.has(methodName) &&
          !AURELIA_CONTEXT_VARIABLES.has(methodName) &&
          !GLOBAL_IDENTIFIERS.has(methodName)
        ) {
          const valStart = match[0]?.indexOf(methodName) ?? 0;
          const { line, col } = getLineAndCol(fullFileContent, matchOffset + valStart);
          diagnostics.push({
            file: filename,
            line,
            col,
            length: methodName.length,
            message: `Method or property '${methodName}' does not exist on ViewModel '${vm.className}'.`,
            severity: 'error',
            source: 'Aurelia AUX',
          });
        }
      }
    } else if (command === 'bind' || command === 'to-view' || command === 'two-way' || command === 'one-time') {
      // Validate property binding expression root identifier
      const propMatch = /^([a-zA-Z0-9_$]+)/.exec(attrValue.trim());
      if (propMatch && propMatch[1]) {
        const propName = propMatch[1];
        if (
          !vm.members.has(propName) &&
          !scopedVars.has(propName) &&
          !AURELIA_CONTEXT_VARIABLES.has(propName) &&
          !GLOBAL_IDENTIFIERS.has(propName)
        ) {
          const valStart = match[0]?.indexOf(propName) ?? 0;
          const { line, col } = getLineAndCol(fullFileContent, matchOffset + valStart);
          diagnostics.push({
            file: filename,
            line,
            col,
            length: propName.length,
            message: `Property or identifier '${propName}' does not exist on ViewModel '${vm.className}'.`,
            severity: 'error',
            source: 'Aurelia AUX',
          });
        }
      }
    }
  }

  // Pass 3: Validate interpolations ${expr}
  const interpRegex = /\$\{([^}]+)\}/g;
  while ((match = interpRegex.exec(templateHtml)) !== null) {
    const expr = match[1]?.trim() ?? '';
    const matchOffset = baseOffset + match.index;
    if (vm.members.size === 0) continue;

    const propMatch = /^([a-zA-Z0-9_$]+)/.exec(expr);
    if (propMatch && propMatch[1]) {
      const propName = propMatch[1];
      if (
        !vm.members.has(propName) &&
        !scopedVars.has(propName) &&
        !AURELIA_CONTEXT_VARIABLES.has(propName) &&
        !GLOBAL_IDENTIFIERS.has(propName)
      ) {
        const valStart = match[0]?.indexOf(propName) ?? 0;
        const { line, col } = getLineAndCol(fullFileContent, matchOffset + valStart);
        diagnostics.push({
          file: filename,
          line,
          col,
          length: propName.length,
          message: `Property or identifier '${propName}' does not exist on ViewModel '${vm.className}'.`,
          severity: 'error',
          source: 'Aurelia AUX',
        });
      }
    }
  }
}
