import type { AuxBlock, AuxDescriptor } from './types.js';

/**
 * Creates a deterministic, compact scope ID for CSS isolation.
 */
export function createScopeId(filename: string): string {
  let hash = 5381;
  for (let i = 0; i < filename.length; i++) {
    hash = ((hash << 5) + hash) ^ filename.charCodeAt(i);
  }
  return 'au-' + (hash >>> 0).toString(36).slice(0, 8);
}

/**
 * Parse an attribute string (e.g. `lang="ts" scoped containerless`) into an object.
 */
export function parseAttrs(rawAttrs: string): Record<string, string | boolean> {
  const attrs: Record<string, string | boolean> = {};
  const attrRegex = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const key = match[1];
    if (!key) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? true;
    attrs[key] = value;
  }

  return attrs;
}

/**
 * Parse a .aux Single-File Component string into its constituent blocks.
 * Properly handles nested <template> tags via depth tracking.
 */
export function parseAux(content: string, filename: string): AuxDescriptor {
  const scopeId = createScopeId(filename);
  let template: AuxBlock | null = null;
  let script: AuxBlock | null = null;
  let setupScript: AuxBlock | null = null;
  let serverScript: AuxBlock | null = null;
  const styles: AuxBlock[] = [];

  let index = 0;
  const length = content.length;

  while (index < length) {
    const nextTag = content.indexOf('<', index);
    if (nextTag === -1) break;

    // Check for comment
    if (content.startsWith('<!--', nextTag)) {
      const commentEnd = content.indexOf('-->', nextTag + 4);
      index = commentEnd === -1 ? length : commentEnd + 3;
      continue;
    }

    // Match tag start
    const tagMatch = /^<([a-zA-Z0-9_-]+)(\s+[^>]*)?>/.exec(content.slice(nextTag));
    if (!tagMatch || !tagMatch[1]) {
      index = nextTag + 1;
      continue;
    }

    const tagName = tagMatch[1].toLowerCase();
    const rawAttrs = tagMatch[2] || '';
    const openTagEnd = nextTag + tagMatch[0].length;

    if (tagName === 'template') {
      // Find matching </template> with depth tracking to support nested <template if.bind="...">
      let depth = 1;
      let searchPos = openTagEnd;
      let closeTagStart = -1;
      let closeTagEnd = -1;

      while (depth > 0 && searchPos < length) {
        const nextSubTag = content.indexOf('<', searchPos);
        if (nextSubTag === -1) break;

        // Skip comments
        if (content.startsWith('<!--', nextSubTag)) {
          const cEnd = content.indexOf('-->', nextSubTag + 4);
          searchPos = cEnd === -1 ? length : cEnd + 3;
          continue;
        }

        if (content.startsWith('</template>', nextSubTag)) {
          depth--;
          if (depth === 0) {
            closeTagStart = nextSubTag;
            closeTagEnd = nextSubTag + 11;
            break;
          }
          searchPos = nextSubTag + 11;
        } else if (/^<template(\s+[^>]*)?>/.test(content.slice(nextSubTag))) {
          const match = /^<template(\s+[^>]*)?>/.exec(content.slice(nextSubTag))!;
          depth++;
          searchPos = nextSubTag + match[0].length;
        } else {
          searchPos = nextSubTag + 1;
        }
      }

      if (closeTagStart !== -1) {
        template = {
          type: 'template',
          content: content.slice(openTagEnd, closeTagStart),
          attrs: parseAttrs(rawAttrs),
          start: openTagEnd,
          end: closeTagStart,
        };
        index = closeTagEnd;
      } else {
        index = openTagEnd;
      }
    } else if (tagName === 'script') {
      const closeTag = '</script>';
      const closePos = content.indexOf(closeTag, openTagEnd);

      if (closePos !== -1) {
        const attrs = parseAttrs(rawAttrs);
        const block: AuxBlock = {
          type: 'script',
          content: content.slice(openTagEnd, closePos),
          attrs,
          start: openTagEnd,
          end: closePos,
          lang: typeof attrs.lang === 'string' ? attrs.lang : 'ts',
        };

        if ('server' in attrs) {
          serverScript = block;
        } else if ('setup' in attrs) {
          setupScript = block;
        } else {
          script = block;
        }

        index = closePos + closeTag.length;
      } else {
        index = openTagEnd;
      }
    } else if (tagName === 'style') {
      const closeTag = '</style>';
      const closePos = content.indexOf(closeTag, openTagEnd);

      if (closePos !== -1) {
        const attrs = parseAttrs(rawAttrs);
        styles.push({
          type: 'style',
          content: content.slice(openTagEnd, closePos),
          attrs,
          start: openTagEnd,
          end: closePos,
          scoped: 'scoped' in attrs,
          lang: typeof attrs.lang === 'string' ? attrs.lang : 'css',
        });
        index = closePos + closeTag.length;
      } else {
        index = openTagEnd;
      }
    } else {
      index = openTagEnd;
    }
  }

  return {
    filename,
    template,
    script,
    setupScript,
    serverScript,
    styles,
    scopeId,
  };
}
