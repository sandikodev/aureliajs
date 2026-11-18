/**
 * @aureliajs/ssr Server Entrypoint
 */

export { renderAurelia, renderToString, detectDefaultSSREngine } from './render.js';
export { IRequestContext, resolveRequestContext } from './tokens.js';
export { serializeState, validatePayload, stringifyPayload } from './serialize.js';
export {
  DEFAULT_SCRIPT_ID,
  createDocumentShell,
  createHydrationScript,
  createHtmlDocument,
  escapeHtml,
  escapeAttr,
  validateHtmlStructure,
} from './html.js';
export type {
  AureliaComponent,
  ComponentProps,
  RenderContext,
  HydrationPayload,
  RenderOptions,
  SSREngine,
  SerializeOptions,
  DocumentShell,
  DocumentOptions,
  DocumentTemplateContext,
  IRequestContext as IRequestContextType,
} from './types.js';
