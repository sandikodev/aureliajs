import * as vscode from 'vscode';
import { analyzeAuxDocument } from './analyzer.js';
import type { AuxDocumentAnalysis } from './types.js';
import { lintAuxDocument } from './linter.js';
import { AuxCompletionItemProvider } from './completion.js';
import { AuxHoverProvider } from './hover.js';
import { AuxDefinitionProvider } from './definition.js';

export function activate(context: vscode.ExtensionContext) {
  // Document analysis cache
  const analysisCache = new Map<string, { version: number; analysis: AuxDocumentAnalysis }>();

  function getDocumentAnalysis(document: vscode.TextDocument): AuxDocumentAnalysis {
    const key = document.uri.toString();
    const cached = analysisCache.get(key);
    if (cached && cached.version === document.version) {
      return cached.analysis;
    }

    const text = document.getText();
    const analysis = analyzeAuxDocument(text);
    analysisCache.set(key, { version: document.version, analysis });
    return analysis;
  }

  // Diagnostics collection (Linter)
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('aurelia-aux');
  context.subscriptions.push(diagnosticCollection);

  // Debounced linter
  let lintTimeout: ReturnType<typeof setTimeout> | undefined;
  function triggerLint(document: vscode.TextDocument) {
    if (document.languageId !== 'aux') return;

    if (lintTimeout) {
      clearTimeout(lintTimeout);
    }

    lintTimeout = setTimeout(() => {
      const analysis = getDocumentAnalysis(document);
      const diagnostics = lintAuxDocument(document, analysis);
      diagnosticCollection.set(document.uri, diagnostics);
    }, 150);
  }

  // Lint active editors on open and change
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId === 'aux') triggerLint(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'aux') triggerLint(event.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
      analysisCache.delete(doc.uri.toString());
    }),
  );

  // Initial lint for all already opened .aux documents
  vscode.workspace.textDocuments.forEach((doc) => {
    if (doc.languageId === 'aux') triggerLint(doc);
  });

  // Register Completion Provider
  // Trigger on '.', '"', "'", '{', ' ', '$'
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'aux',
    new AuxCompletionItemProvider(getDocumentAnalysis),
    '.',
    '"',
    "'",
    '{',
    ' ',
    '$',
  );
  context.subscriptions.push(completionProvider);

  // Register Hover Provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    'aux',
    new AuxHoverProvider(getDocumentAnalysis),
  );
  context.subscriptions.push(hoverProvider);

  // Register Definition Provider
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    'aux',
    new AuxDefinitionProvider(getDocumentAnalysis),
  );
  context.subscriptions.push(definitionProvider);
}

export function deactivate() {}
