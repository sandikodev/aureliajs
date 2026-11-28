import ts from 'typescript';
import type { AuxDocumentAnalysis, ScriptAnalysis } from './types';
import { AURELIA_COMMANDS, AURELIA_CONTEXT_VARIABLES } from './constants';

export type AuxDiagnosticSeverity = 'error' | 'warning';

export interface RawAuxDiagnostic {
  startOffset: number;
  endOffset: number;
  severity: AuxDiagnosticSeverity;
  code: string;
  message: string;
}

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
  'Object',
  'Promise',
  'Map',
  'Set',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
]);

const VALID_COMMANDS = new Set(Object.keys(AURELIA_COMMANDS));

/**
 * Collects template diagnostics against the analyzed ViewModel (`<script>`, `<script setup>`,
 * `<script server>`, and template-declared bindables) without depending on VS Code runtime APIs.
 */
export function collectAuxDiagnostics(analysis: AuxDocumentAnalysis): RawAuxDiagnostic[] {
  const diagnostics: RawAuxDiagnostic[] = [];
  const { script, template } = analysis;
  const hasValidationContext = script.hasScript || script.members.size > 0;

  // Track loop variables declared in repeat.for blocks: e.g. "option of options" -> "option"
  const scopedVariables = new Set<string>();
  const repeatIterables = new Map<object, { expr: string; offset: number }>();

  // Pass 1: Collect scoped variables from repeat.for bindings
  for (const binding of template.bindings) {
    if (binding.command === 'for' || binding.fullAttributeName === 'repeat.for') {
      const destructuredMatch = /^\s*\[([^\]]+)\]\s+of\s+([\s\S]+)$/.exec(binding.expression);
      if (destructuredMatch) {
        for (const rawVar of (destructuredMatch[1] ?? '').split(',')) {
          const v = rawVar.trim();
          if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(v)) {
            scopedVariables.add(v);
          }
        }
        const rhs = destructuredMatch[2] ?? '';
        const rhsOffset = binding.valueRange.start + binding.expression.indexOf(rhs);
        repeatIterables.set(binding, { expr: rhs, offset: rhsOffset });
        continue;
      }

      const match = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s+of\s+([\s\S]+)$/.exec(binding.expression);
      if (match) {
        const itemVar = match[1];
        if (itemVar) scopedVariables.add(itemVar);
        const rhs = match[2] ?? '';
        const rhsOffset = binding.valueRange.start + binding.expression.indexOf(rhs);
        repeatIterables.set(binding, { expr: rhs, offset: rhsOffset });
      } else {
        diagnostics.push({
          startOffset: binding.valueRange.start,
          endOffset: binding.valueRange.end,
          severity: 'error',
          code: 'invalid-repeat',
          message: `Invalid repeat expression. Expected 'item of items' syntax, but received: "${binding.expression}"`,
        });
      }
    }
  }

  // Pass 2: Validate binding commands and expressions
  for (const binding of template.bindings) {
    if (!VALID_COMMANDS.has(binding.command)) {
      const dotOffset = binding.nameRange.start + binding.targetAttribute.length + 1;
      diagnostics.push({
        startOffset: dotOffset,
        endOffset: binding.nameRange.end,
        severity: 'warning',
        code: 'unknown-binding-command',
        message: `Unknown Aurelia binding command '.${binding.command}'. Did you mean '.bind' or '.trigger'?`,
      });
      continue;
    }

    if (!hasValidationContext) {
      continue;
    }

    if (binding.command === 'for' || binding.fullAttributeName === 'repeat.for') {
      const iterable = repeatIterables.get(binding);
      if (iterable && iterable.expr.trim()) {
        validateGeneralExpression(
          iterable.expr,
          iterable.offset,
          script,
          scopedVariables,
          diagnostics,
        );
      }
      continue;
    }

    const expr = binding.expression.trim();
    if (!expr) continue;

    const exprStartOffset =
      binding.valueRange.start + (binding.expression.length - binding.expression.trimStart().length);

    if (binding.command === 'trigger' || binding.command === 'capture') {
      validateEventHandlerExpression(
        expr,
        exprStartOffset,
        script,
        scopedVariables,
        diagnostics,
      );
    } else {
      validateGeneralExpression(
        expr,
        exprStartOffset,
        script,
        scopedVariables,
        diagnostics,
      );
    }
  }

  // Pass 3: Validate interpolations ${expr}
  if (hasValidationContext) {
    for (const interp of template.interpolations) {
      const expr = interp.expression.trim();
      if (!expr) continue;
      const exprStartOffset =
        interp.range.start + (interp.expression.length - interp.expression.trimStart().length);
      validateGeneralExpression(
        expr,
        exprStartOffset,
        script,
        scopedVariables,
        diagnostics,
      );
    }
  }

  return diagnostics;
}

function validateEventHandlerExpression(
  expr: string,
  startOffset: number,
  script: ScriptAnalysis,
  scopedVariables: Set<string>,
  diagnostics: RawAuxDiagnostic[],
): void {
  const simpleCallMatch = /^([a-zA-Z0-9_$]+)(?:\s*\(([\s\S]*)\))?$/.exec(expr);
  if (!simpleCallMatch) {
    validateGeneralExpression(expr, startOffset, script, scopedVariables, diagnostics);
    return;
  }

  const rootIdentifier = simpleCallMatch[1] ?? '';
  if (
    rootIdentifier &&
    !isKnownIdentifier(rootIdentifier, script, scopedVariables) &&
    !GLOBAL_IDENTIFIERS.has(rootIdentifier)
  ) {
    const matchStart = startOffset + expr.indexOf(rootIdentifier);
    diagnostics.push({
      startOffset: matchStart,
      endOffset: matchStart + rootIdentifier.length,
      severity: 'error',
      code: 'unknown-member',
      message: `Method or property '${rootIdentifier}' does not exist on ViewModel '${script.className}'.`,
    });
  }

  if (simpleCallMatch[2]?.trim()) {
    const argsRaw = simpleCallMatch[2];
    const openParenIdx = expr.indexOf('(');
    const argsOffset = startOffset + openParenIdx + 1;
    validateGeneralExpression(argsRaw, argsOffset, script, scopedVariables, diagnostics);
  }
}

function validateGeneralExpression(
  expr: string,
  startOffset: number,
  script: ScriptAnalysis,
  scopedVariables: Set<string>,
  diagnostics: RawAuxDiagnostic[],
): void {
  try {
    const prefix = 'const _ = (';
    const sourceFile = ts.createSourceFile(
      '__expr.ts',
      `${prefix}${expr})`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        // Skip property access right-hand sides: e.g. `option.value` -> skip `value`
        if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
          return;
        }

        // Skip object literal property keys: e.g. `{ active: isActive }` -> skip `active`
        if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
          return;
        }

        const id = node.text;
        if (id === '_') return;

        if (!GLOBAL_IDENTIFIERS.has(id) && !isKnownIdentifier(id, script, scopedVariables)) {
          const nodeStartInExpr = node.getStart(sourceFile) - prefix.length;
          if (nodeStartInExpr >= 0 && nodeStartInExpr < expr.length) {
            const absoluteStart = startOffset + nodeStartInExpr;
            const absoluteEnd = absoluteStart + node.getWidth(sourceFile);
            diagnostics.push({
              startOffset: absoluteStart,
              endOffset: absoluteEnd,
              severity: 'error',
              code: 'unknown-member',
              message: `Property or identifier '${id}' does not exist on ViewModel '${script.className}'.`,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  } catch {
    // Gracefully skip malformed in-progress expressions
  }
}

function isKnownIdentifier(
  name: string,
  script: ScriptAnalysis,
  scopedVariables: Set<string>,
): boolean {
  if (script.members.has(name)) return true;
  if (scopedVariables.has(name)) return true;
  if (name in AURELIA_CONTEXT_VARIABLES) return true;
  return false;
}
