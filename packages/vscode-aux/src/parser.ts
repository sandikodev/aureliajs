export interface AuxBlock {
  type: 'template' | 'script' | 'style';
  content: string;
  startOffset: number;
  endOffset: number;
  attrs: Record<string, string | boolean>;
}

export interface AuxParsedBlocks {
  template: AuxBlock | null;
  script: AuxBlock | null;
  styles: AuxBlock[];
}

/**
 * Parses a .aux Single-File Component into its constituent blocks.
 */
export function parseAuxBlocks(content: string): AuxParsedBlocks {
  let templateBlock: AuxBlock | null = null;
  let scriptBlock: AuxBlock | null = null;
  const styleBlocks: AuxBlock[] = [];

  // Match <template ...> ... </template> handling nested tags by tracking depth
  const templateStartRegex = /<template\b([^>]*)>/i;
  const templateStartMatch = templateStartRegex.exec(content);

  if (templateStartMatch) {
    const startIdx = templateStartMatch.index;
    const contentStart = startIdx + templateStartMatch[0].length;
    const attrsStr = templateStartMatch[1] ?? '';
    const attrs = parseAttributes(attrsStr);

    let depth = 1;
    let currentIdx = contentStart;
    let endIdx = -1;

    const tagRegex = /<\/?template\b[^>]*>/gi;
    tagRegex.lastIndex = currentIdx;

    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(content)) !== null) {
      if (tagMatch[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIdx = tagMatch.index;
          break;
        }
      } else {
        depth++;
      }
    }

    if (endIdx !== -1) {
      templateBlock = {
        type: 'template',
        content: content.slice(contentStart, endIdx),
        startOffset: contentStart,
        endOffset: endIdx,
        attrs,
      };
    }
  }

  // Match <script ...> ... </script>
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/i;
  const scriptMatch = scriptRegex.exec(content);
  if (scriptMatch) {
    const fullTag = scriptMatch[0];
    const attrsStr = scriptMatch[1] ?? '';
    const innerContent = scriptMatch[2] ?? '';
    const openTagLength = fullTag.indexOf('>') + 1;
    const contentStart = scriptMatch.index + openTagLength;
    const contentEnd = contentStart + innerContent.length;

    scriptBlock = {
      type: 'script',
      content: innerContent,
      startOffset: contentStart,
      endOffset: contentEnd,
      attrs: parseAttributes(attrsStr),
    };
  }

  // Match all <style ...> ... </style>
  const styleRegex = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(content)) !== null) {
    const fullTag = styleMatch[0];
    const attrsStr = styleMatch[1] ?? '';
    const innerContent = styleMatch[2] ?? '';
    const openTagLength = fullTag.indexOf('>') + 1;
    const contentStart = styleMatch.index + openTagLength;
    const contentEnd = contentStart + innerContent.length;

    styleBlocks.push({
      type: 'style',
      content: innerContent,
      startOffset: contentStart,
      endOffset: contentEnd,
      attrs: parseAttributes(attrsStr),
    });
  }

  return {
    template: templateBlock,
    script: scriptBlock,
    styles: styleBlocks,
  };
}

function parseAttributes(attrString: string): Record<string, string | boolean> {
  const attrs: Record<string, string | boolean> = {};
  const attrRegex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    if (!name) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? true;
    attrs[name] = value;
  }

  return attrs;
}
