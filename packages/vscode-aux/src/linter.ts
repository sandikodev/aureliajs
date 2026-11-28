import * as vscode from 'vscode';
import type { AuxDocumentAnalysis } from './types';
import { collectAuxDiagnostics } from './diagnostics';

/**
 * Validates template expressions against the ViewModel extracted from `<script>`,
 * `<script setup>`, and `<script server>`, returning VS Code diagnostics.
 */
export function lintAuxDocument(
  document: vscode.TextDocument,
  analysis: AuxDocumentAnalysis,
): vscode.Diagnostic[] {
  return collectAuxDiagnostics(analysis).map((raw) => {
    const range = new vscode.Range(
      document.positionAt(raw.startOffset),
      document.positionAt(raw.endOffset),
    );
    const diagnostic = new vscode.Diagnostic(
      range,
      raw.message,
      raw.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = 'Aurelia AUX';
    diagnostic.code = raw.code;
    return diagnostic;
  });
}
