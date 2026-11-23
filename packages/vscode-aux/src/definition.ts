import * as vscode from 'vscode';
import type { AuxDocumentAnalysis } from './types';

export class AuxDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private getAnalysis: (doc: vscode.TextDocument) => AuxDocumentAnalysis) {}

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const offset = document.offsetAt(position);
    const analysis = this.getAnalysis(document);
    const { template, script } = analysis;

    // Check if inside a binding value or interpolation
    const isInsideBinding = template.bindings.some(
      (b) => offset >= b.valueRange.start && offset <= b.valueRange.end,
    );
    const isInsideInterp = template.interpolations.some(
      (i) => offset >= i.range.start && offset <= i.range.end,
    );

    if (!isInsideBinding && !isInsideInterp) {
      return null;
    }

    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;
    const word = document.getText(wordRange);

    const member = script.members.get(word);
    if (member) {
      const targetPos = document.positionAt(member.offset);
      const targetRange = new vscode.Range(targetPos, document.positionAt(member.offset + member.length));
      return new vscode.Location(document.uri, targetRange);
    }

    return null;
  }
}
