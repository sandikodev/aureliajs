import * as vscode from 'vscode';
import type { AuxDocumentAnalysis } from './types';
import { AURELIA_COMMANDS, AURELIA_CONTEXT_VARIABLES } from './constants';

export class AuxHoverProvider implements vscode.HoverProvider {
  constructor(private getAnalysis: (doc: vscode.TextDocument) => AuxDocumentAnalysis) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const offset = document.offsetAt(position);
    const analysis = this.getAnalysis(document);
    const { template, script } = analysis;

    // Check if hovering over a binding command on an attribute: e.g. .bind or .trigger
    for (const binding of template.bindings) {
      if (offset >= binding.nameRange.start && offset <= binding.nameRange.end) {
        const dotIdx = binding.fullAttributeName.indexOf('.');
        const cmd = binding.command;
        const meta = AURELIA_COMMANDS[cmd];

        if (meta) {
          const md = new vscode.MarkdownString();
          md.appendMarkdown(`**Aurelia Binding Command: \`.${cmd}\`**\n\n`);
          md.appendMarkdown(`${meta.doc}\n\n`);
          md.appendMarkdown(`*Target attribute*: \`${binding.targetAttribute}\``);
          const range = new vscode.Range(
            document.positionAt(binding.nameRange.start + dotIdx),
            document.positionAt(binding.nameRange.end),
          );
          return new vscode.Hover(md, range);
        }
      }

      // Check if hovering over a property / method inside the binding expression
      if (offset >= binding.valueRange.start && offset <= binding.valueRange.end) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) continue;
        const word = document.getText(wordRange);

        // Check contextual variables ($event, $this, etc.)
        if (word in AURELIA_CONTEXT_VARIABLES) {
          const ctx = AURELIA_CONTEXT_VARIABLES[word]!;
          const md = new vscode.MarkdownString();
          md.appendCodeblock(`(contextual) ${ctx.label}: ${ctx.type}`, 'typescript');
          md.appendMarkdown(`\n${ctx.doc}`);
          return new vscode.Hover(md, wordRange);
        }

        // Check ViewModel class members
        const member = script.members.get(word);
        if (member) {
          const md = new vscode.MarkdownString();
          const bindablePrefix = member.isBindable ? '@bindable ' : '';
          const kindPrefix = member.kind === 'getter' ? '(get) ' : member.kind === 'method' ? '(method) ' : '';
          md.appendCodeblock(
            `${bindablePrefix}${kindPrefix}${script.className}.${member.name}: ${member.typeString}`,
            'typescript',
          );
          if (member.docComment) {
            md.appendMarkdown(`\n${member.docComment}`);
          }
          return new vscode.Hover(md, wordRange);
        }
      }
    }

    // Check if hovering over an interpolation ${prop}
    for (const interp of template.interpolations) {
      if (offset >= interp.range.start && offset <= interp.range.end) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) continue;
        const word = document.getText(wordRange);

        const member = script.members.get(word);
        if (member) {
          const md = new vscode.MarkdownString();
          const kindPrefix = member.kind === 'getter' ? '(get) ' : member.kind === 'method' ? '(method) ' : '';
          md.appendCodeblock(`${kindPrefix}${script.className}.${member.name}: ${member.typeString}`, 'typescript');
          return new vscode.Hover(md, wordRange);
        }
      }
    }

    return null;
  }
}
