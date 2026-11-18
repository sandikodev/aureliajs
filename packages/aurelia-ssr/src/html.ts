/**
 * @aureliajs/ssr HTML5 Document Builder
 *
 * Standards-compliant HTML5 document assembler and streaming shell generator.
 * Embeds serialized state via inert `<script type="application/json">` elements —
 * zero `window` global pollution and strict-CSP compatible without `unsafe-inline`.
 */

import type {
  DocumentOptions,
  DocumentShell,
  DocumentTemplateContext,
  HydrationPayload,
} from './types.js';
import { stringifyPayload } from './serialize.js';

export const DEFAULT_SCRIPT_ID = '__AURELIA_SSR_DATA__';

function renderAttrs(attrs?: Readonly<Record<string, string>>): string {
  if (!attrs) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (!key) continue;
    parts.push(`${escapeAttr(key)}="${escapeAttr(value)}"`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function toArray(value?: string | readonly string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value as string];
}

function resolveSafeRootTag(rootTag?: string | false): string {
  if (rootTag === false || rootTag === '') return '';
  const candidate = rootTag ?? 'app-root';
  return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(candidate) ? candidate : '';
}

function buildHeadAndScripts<
  TContext extends Record<string, unknown>,
  TData,
>(options: DocumentOptions<TContext, TData>): {
  head: string;
  scripts: string;
  htmlAttrStr: string;
  bodyAttrStr: string;
  safeRootTag: string;
} {
  const {
    title = 'Aurelia App',
    lang = 'en',
    basePath,
    rootTag = 'app-root',
    htmlAttrs,
    bodyAttrs,
    cssBundle,
    jsBundle,
    head: extraHead = '',
    nonce,
  } = options;

  const nonceAttr = nonce ? ` nonce="${escapeAttr(nonce)}"` : '';

  const cssLinks = toArray(cssBundle)
    .map((href) => `<link rel="stylesheet" href="${escapeAttr(href)}" />`)
    .join('\n    ');

  const scripts = toArray(jsBundle)
    .map((src) => `<script type="module" src="${escapeAttr(src)}"${nonceAttr}></script>`)
    .join('\n    ');

  const headParts: string[] = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
  ];

  if (basePath !== undefined) {
    headParts.push(`<base href="${escapeAttr(basePath)}" />`);
  }
  if (cssLinks) {
    headParts.push(cssLinks);
  }
  if (extraHead) {
    headParts.push(extraHead);
  }

  return {
    head: headParts.join('\n    '),
    scripts,
    htmlAttrStr: renderAttrs({ lang, ...htmlAttrs }),
    bodyAttrStr: renderAttrs(bodyAttrs),
    safeRootTag: resolveSafeRootTag(rootTag),
  };
}

/**
 * Create an HTML5-standard inert JSON `<script type="application/json">` element
 * carrying the XSS-escaped hydration payload.
 */
export function createHydrationScript<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(
  payload: HydrationPayload<TContext, TData>,
  scriptId = DEFAULT_SCRIPT_ID
): string {
  const payloadJson = stringifyPayload(payload);
  return `<script id="${escapeAttr(scriptId)}" type="application/json">${payloadJson}</script>`;
}

/**
 * Split an HTML5 document into streaming `preamble` (flushed immediately before SSR)
 * and `postamble` (flushed after SSR body + hydration script).
 */
export function createDocumentShell<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(options: DocumentOptions<TContext, TData> = {}): DocumentShell {
  const { head, scripts, htmlAttrStr, bodyAttrStr, safeRootTag } =
    buildHeadAndScripts(options);

  const openRoot = safeRootTag ? `<${safeRootTag}>` : '';
  const closeRoot = safeRootTag ? `</${safeRootTag}>` : '';

  const preamble = `<!DOCTYPE html>
<html${htmlAttrStr}>
  <head>
    ${head}
  </head>
  <body${bodyAttrStr}>
    ${openRoot}`;

  const postamble = `${closeRoot}${scripts ? `\n    ${scripts}` : ''}
  </body>
</html>`;

  return { preamble, postamble };
}

/**
 * Assemble a complete buffered HTML5 document from server-rendered markup
 * and an XSS-escaped JSON hydration payload.
 */
export function createHtmlDocument<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(
  bodyContent: string,
  payload: HydrationPayload<TContext, TData>,
  options: DocumentOptions<TContext, TData> = {}
): string {
  const { scriptId = DEFAULT_SCRIPT_ID, template } = options;
  const { head, scripts, htmlAttrStr, bodyAttrStr, safeRootTag } =
    buildHeadAndScripts(options);

  const hydrationScript = createHydrationScript(payload, scriptId);
  const body = safeRootTag
    ? `<${safeRootTag}>${bodyContent}</${safeRootTag}>`
    : bodyContent;

  const templateCtx: DocumentTemplateContext<TContext, TData> = {
    body,
    head,
    hydrationScript,
    scripts,
    payload,
    options,
  };

  if (typeof template === 'function') {
    return template(templateCtx);
  }

  if (typeof template === 'string') {
    return template
      .replace('<!--app-head-->', head)
      .replace('<!--app-hydration-->', hydrationScript)
      .replace('<!--app-html-->', body)
      .replace('<!--app-scripts-->', scripts);
  }

  return `<!DOCTYPE html>
<html${htmlAttrStr}>
  <head>
    ${head}
  </head>
  <body${bodyAttrStr}>
    ${body}
    ${hydrationScript}${scripts ? `\n    ${scripts}` : ''}
  </body>
</html>`;
}

/**
 * Escape HTML special characters in text content.
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Escape HTML special characters in attribute values.
 */
export function escapeAttr(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&"']/g, (char) => map[char] || char);
}

/**
 * Validate minimal HTML5 document structure.
 */
export function validateHtmlStructure(html: string): boolean {
  return (
    html.includes('<!DOCTYPE html>') &&
    html.includes('<html') &&
    html.includes('<head') &&
    html.includes('<body')
  );
}
