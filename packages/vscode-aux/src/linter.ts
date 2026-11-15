import * as vscode from 'vscode';
import ts from 'typescript';
import type { AuxDocumentAnalysis } from './types.js';
import { AURELIA_COMMANDS, AURELIA_CONTEXT_VARIABLES } from './constants.js';

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

/**
 * Validates template expressions against the ViewModel class extracted from the <script> block.
 * Uses TypeScript AST parsing for deep semantic linting of complex expressions, ternaries,
 * logical operators, and method calls.
 */
export function lintAuxDocument(
  document: vscode.TextDocument,
  analysis: AuxDocumentAnalysis,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const { script, template } = analysis;

  // Track loop variables declared in repeat.for blocks: e.g. "option of options" -> "option"
  const scopedVariables = new Set<string>();

  // Pass 1: Collect scoped variables from repeat.for bindings
  for (const binding of template.bindings) {
    if (binding.command === 'for' || binding.fullAttributeName === 'repeat.for') {
      const match = /^\s*([a-zA-Z0-9_$]+)\s+of\s+(.+)$/.exec(binding.expression);
      if (match) {
        const itemVar = match[1];
        if (itemVar) scopedVariables.add(itemVar);
      } else {
        const range = createRangeFromOffsets(document, binding.valueRange.start, binding.valueRange.end);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Invalid repeat expression. Expected 'item of items' syntax, but received: "${binding.expression}"`,
            vscode.DiagnosticSeverity.Error,
          ),
        );
      }
    }
  }

  // Pass 2: Validate binding commands and expressions
  for (const binding of template.bindings) {
    // Check if the command is a recognized Aurelia binding command
    const validCommands = Object.keys(AURELIA_COMMANDS);
    if (!validCommands.includes(binding.command)) {
      const dotOffset = binding.nameRange.start + binding.targetAttribute.length + 1;
      const range = createRangeFromOffsets(document, dotOffset, binding.nameRange.end);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Unknown Aurelia binding command '.${binding.command}'. Did you mean '.bind' or '.trigger'?`,
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = 'Aurelia AUX';
      diagnostics.push(diagnostic);
      continue;
    }

    if (!script.hasScript || script.members.size === 0) {
      continue;
    }

    const expr = binding.expression.trim();
    if (!expr) continue;

    if (binding.command === 'trigger' || binding.command === 'capture') {
      // Validate event handler method calls e.g. "handleClick($event)" or "save"
      validateEventHandlerExpression(expr, binding.valueRange.start, document, script, scopedVariables, diagnostics);
    } else {
      // Validate general binding expressions: e.g. "ariaLabel || null" or "invalid ? 'true' : null"
      validateGeneralExpression(expr, binding.valueRange.start, document, script, scopedVariables, diagnostics);
    }
  }

  // Pass 3: Validate interpolations ${expr}
  if (script.hasScript && script.members.size > 0) {
    for (const interp of template.interpolations) {
      const expr = interp.expression.trim();
      if (!expr) continue;
      validateGeneralExpression(expr, interp.range.start, document, script, scopedVariables, diagnostics);
    }
  }

  return diagnostics;
}

/**
 * Parses an event handler expression (e.g. `handleClick($event)` or `toastSvc.dismiss(toast.id)`)
 * and checks that the called function/method exists.
 */
function validateEventHandlerExpression(
  expr: string,
  startOffset: number,
  document: vscode.TextDocument,
  script: { members: Map<string, any>; className: string },
  scopedVariables: Set<string>,
  diagnostics: vscode.Diagnostic[],
) {
  const methodMatch = /^([a-zA-Z0-9_$]+)(?:\s*\((.*)\))?/.exec(expr);
  if (!methodMatch) return;

  const rootIdentifier = methodMatch[1] ?? '';
  if (
    rootIdentifier &&
    !isKnownIdentifier(rootIdentifier, script, scopedVariables) &&
    !GLOBAL_IDENTIFIERS.has(rootIdentifier)
  ) {
    const matchStart = startOffset + expr.indexOf(rootIdentifier);
    const range = createRangeFromOffsets(document, matchStart, matchStart + rootIdentifier.length);
    const diag = new vscode.Diagnostic(
      range,
      `Method or property '${rootIdentifier}' does not exist on ViewModel '${script.className}'.`,
      vscode.DiagnosticSeverity.Error,
    );
    diag.source = 'Aurelia AUX';
    diagnostics.push(diag);
  }

  // Also validate any arguments passed inside parens: e.g. ($event, toast.id)
  if (methodMatch[2]) {
    validateGeneralExpression(methodMatch[2], startOffset + expr.indexOf(methodMatch[2]), document, script, scopedVariables, diagnostics);
  }
}

/**
 * Uses TypeScript Compiler API to parse an expression into an AST,
 * identifying all root variable references and checking them against ViewModel members.
 */
function validateGeneralExpression(
  expr: string,
  startOffset: number,
  document: vscode.TextDocument,
  script: { members: Map<string, any>; className: string },
  scopedVariables: Set<string>,
  diagnostics: vscode.Diagnostic[],
) {
  try {
    const sourceFile = ts.createSourceFile(
      '__expr.ts',
      `const _ = (${expr})`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    function visit(node: ts.Node) {
      if (ts.isIdentifier(node)) {
        // Skip property access right-hand sides: e.g. in `option.value`, skip `value` because it's on `option`
        if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
          return;
        }

        const id = node.text;

        // Skip internal wrapper identifier `_`
        if (id === '_') return;

        if (
          !GLOBAL_IDENTIFIERS.has(id) &&
          !isKnownIdentifier(id, script, scopedVariables)
        ) {
          // Calculate exact position in the original document
          const nodeStartInExpr = node.getStart(sourceFile) - 'const _ = ('.length;
          if (nodeStartInExpr >= 0 && nodeStartInExpr < expr.length) {
            const absoluteStart = startOffset + nodeStartInExpr;
            const absoluteEnd = absoluteStart + node.getWidth(sourceFile);
            const range = createRangeFromOffsets(document, absoluteStart, absoluteEnd);

            const diag = new vscode.Diagnostic(
              range,
              `Property or identifier '${id}' does not exist on ViewModel '${script.className}'.`,
              vscode.DiagnosticSeverity.Error,
            );
            diag.source = 'Aurelia AUX';
            diagnostics.push(diag);
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  } catch {
    // If expression is in the middle of being typed, skip diagnostics gracefully
  }
}

function isKnownIdentifier(
  name: string,
  script: { members: Map<string, any>; className: string },
  scopedVariables: Set<string>,
): boolean {
  if (script.members.has(name)) return true;
  if (scopedVariables.has(name)) return true;
  if (name in AURELIA_CONTEXT_VARIABLES) return true;
  return false;
}

function createRangeFromOffsets(document: vscode.TextDocument, startOffset: number, endOffset: number): vscode.Range {
  const startPos = document.positionAt(startOffset);
  const endPos = document.positionAt(endOffset);
  return new vscode.Range(startPos, endPos);
}
