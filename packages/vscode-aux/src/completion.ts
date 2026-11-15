import * as vscode from 'vscode';
import type { AuxDocumentAnalysis, ViewModelMember } from './types.js';
import { AURELIA_COMMANDS, AURELIA_CONTEXT_VARIABLES, AURELIA_DIRECTIVES, MDN_HTML_ATTRIBUTES } from './constants.js';

export class AuxCompletionItemProvider implements vscode.CompletionItemProvider {
  constructor(private getAnalysis: (doc: vscode.TextDocument) => AuxDocumentAnalysis) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const offset = document.offsetAt(position);
    const lineText = document.lineAt(position.line).text;
    const linePrefix = lineText.slice(0, position.character);

    const analysis = this.getAnalysis(document);
    const { template, script } = analysis;

    // Only provide completions if inside the <template> block
    if (offset < template.templateStartOffset || offset > template.templateEndOffset) {
      return null;
    }

    // SCENARIO 1: Triggered after a dot on an attribute name: e.g. "for." or "click." or "style."
    const dotAttrMatch = /([a-zA-Z0-9_-]+)\.\s*$/.exec(linePrefix);
    if (dotAttrMatch) {
      return this.provideBindingCommandCompletions(document, position);
    }

    // SCENARIO 2: Inside quotes of a binding attribute: e.g. for.bind="|" or click.trigger="|"
    const inBindingValue = this.findBindingAtOffset(template.bindings, offset);
    if (inBindingValue || this.isInsideQuotesOfBinding(linePrefix)) {
      const loopVars = this.collectScopedLoopVariables(template.bindings);
      return this.provideViewModelMemberCompletions(script, loopVars, inBindingValue?.command);
    }

    // SCENARIO 3: Inside interpolation braces: e.g. ${|} or ${op|
    if (this.isInsideInterpolation(linePrefix)) {
      const loopVars = this.collectScopedLoopVariables(template.bindings);
      return this.provideViewModelMemberCompletions(script, loopVars);
    }

    // SCENARIO 4: Inside an HTML opening tag: e.g. <select | or <input |
    if (this.isInsideOpeningTag(linePrefix)) {
      const currentTagName = this.getCurrentOpeningTagName(linePrefix);
      return this.provideTagAttributeCompletions(currentTagName);
    }

    return null;
  }

  /**
   * Suggests Aurelia binding commands (e.g. .bind, .trigger, .one-time, etc.)
   */
  private provideBindingCommandCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const lineText = document.lineAt(position.line).text;
    const charAfterCursor = lineText.charAt(position.character);
    const hasEqualsAfter = charAfterCursor === '=' || /^\s*=/.test(lineText.slice(position.character));

    return Object.entries(AURELIA_COMMANDS).map(([cmd, meta]) => {
      const item = new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Keyword);
      item.detail = `Aurelia Command: .${cmd}`;
      item.documentation = new vscode.MarkdownString(meta.doc);

      if (hasEqualsAfter) {
        item.insertText = cmd;
      } else {
        item.insertText = new vscode.SnippetString(meta.insertSnippet ?? `${cmd}="$1"`);
      }

      item.sortText = `0_${cmd}`;
      return item;
    });
  }

  /**
   * Suggests ViewModel class members (properties, getters, methods) + loop variables + template context variables
   */
  private provideViewModelMemberCompletions(
    script: { members: Map<string, ViewModelMember>; className: string },
    loopVariables: string[],
    command?: string,
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // Add loop variables (highest priority)
    for (const loopVar of loopVariables) {
      const item = new vscode.CompletionItem(loopVar, vscode.CompletionItemKind.Variable);
      item.detail = `(loop item) ${loopVar}`;
      item.documentation = new vscode.MarkdownString(`Iterator variable declared in \`repeat.for="${loopVar} of ..."\``);
      item.sortText = `0_${loopVar}`;
      items.push(item);
    }

    // Add ViewModel class members
    for (const member of script.members.values()) {
      let kind = vscode.CompletionItemKind.Property;
      let detailPrefix = '(property)';
      let insertText: string | vscode.SnippetString = member.name;

      if (member.kind === 'getter') {
        kind = vscode.CompletionItemKind.Property;
        detailPrefix = '(get)';
      } else if (member.kind === 'method') {
        kind = vscode.CompletionItemKind.Method;
        detailPrefix = '(method)';
        if (command === 'trigger' || command === 'capture') {
          insertText = new vscode.SnippetString(`${member.name}(\${1:\\$event})`);
        }
      }

      const item = new vscode.CompletionItem(member.name, kind);
      item.detail = `${member.isBindable ? '@bindable ' : ''}${detailPrefix} ${script.className}.${member.name}: ${member.typeString}`;
      item.insertText = insertText;
      item.sortText = `1_${member.name}`;

      if (member.docComment) {
        item.documentation = new vscode.MarkdownString(member.docComment);
      }

      items.push(item);
    }

    // Add Aurelia contextual variables ($event, $this, $parent, $index, etc.)
    for (const ctx of Object.values(AURELIA_CONTEXT_VARIABLES)) {
      const item = new vscode.CompletionItem(ctx.label, vscode.CompletionItemKind.Variable);
      item.detail = `(contextual) ${ctx.label}: ${ctx.type}`;
      item.documentation = new vscode.MarkdownString(ctx.doc);
      item.sortText = `2_${ctx.label}`;
      items.push(item);
    }

    return items;
  }

  /**
   * Suggests standard HTML attributes (from MDN) + Aurelia template directives
   */
  private provideTagAttributeCompletions(tagName: string | null): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // 1. Tag-specific HTML attributes
    if (tagName && tagName in MDN_HTML_ATTRIBUTES) {
      const specificAttrs = MDN_HTML_ATTRIBUTES[tagName]!;
      for (const attr of specificAttrs) {
        const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
        item.detail = `HTML Attribute <${tagName} ${attr}>`;
        item.insertText = new vscode.SnippetString(`${attr}="$1"`);
        item.sortText = `0_${attr}`;
        items.push(item);
      }
    }

    // 2. Global HTML attributes
    for (const attr of MDN_HTML_ATTRIBUTES.global ?? []) {
      const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
      item.detail = `Global HTML Attribute: ${attr}`;
      item.insertText = new vscode.SnippetString(`${attr}="$1"`);
      item.sortText = `1_${attr}`;
      items.push(item);
    }

    // 3. Aurelia Directives
    for (const [dir, meta] of Object.entries(AURELIA_DIRECTIVES)) {
      const item = new vscode.CompletionItem(dir, vscode.CompletionItemKind.Snippet);
      item.detail = `Aurelia Directive: ${dir}`;
      item.documentation = new vscode.MarkdownString(meta.doc);
      item.insertText = new vscode.SnippetString(meta.insertSnippet);
      item.sortText = `2_${dir}`;
      items.push(item);
    }

    return items;
  }

  private collectScopedLoopVariables(bindings: any[]): string[] {
    const vars: string[] = [];
    for (const binding of bindings) {
      if (binding.command === 'for' || binding.fullAttributeName === 'repeat.for') {
        const match = /^\s*([a-zA-Z0-9_$]+)\s+of\s+/.exec(binding.expression);
        if (match && match[1]) {
          vars.push(match[1]);
        }
      }
    }
    return vars;
  }

  private findBindingAtOffset(bindings: any[], offset: number): any | null {
    for (const binding of bindings) {
      if (offset >= binding.valueRange.start && offset <= binding.valueRange.end) {
        return binding;
      }
    }
    return null;
  }

  private isInsideQuotesOfBinding(linePrefix: string): boolean {
    const match = /\.[a-zA-Z0-9_-]+=\s*["']([^"']*)$/.exec(linePrefix);
    return Boolean(match);
  }

  private isInsideInterpolation(linePrefix: string): boolean {
    const lastOpen = linePrefix.lastIndexOf('${');
    if (lastOpen === -1) return false;
    const lastClose = linePrefix.lastIndexOf('}');
    return lastOpen > lastClose;
  }

  private isInsideOpeningTag(linePrefix: string): boolean {
    const lastTagOpen = linePrefix.lastIndexOf('<');
    if (lastTagOpen === -1) return false;
    const lastTagClose = linePrefix.lastIndexOf('>');
    return lastTagOpen > lastTagClose;
  }

  private getCurrentOpeningTagName(linePrefix: string): string | null {
    const lastTagOpen = linePrefix.lastIndexOf('<');
    if (lastTagOpen === -1) return null;
    const tagSubstr = linePrefix.slice(lastTagOpen + 1);
    const match = /^([a-zA-Z0-9_-]+)/.exec(tagSubstr);
    return match ? match[1]!.toLowerCase() : null;
  }
}
