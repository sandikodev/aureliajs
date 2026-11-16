/**
 * @aureliajs/ssr Server Entrypoint
 * 
 * Server-only exports for Node.js, Bun, and SSR runtimes.
 */

export { renderAurelia, renderToString } from './render.js';
export { serializeState, validatePayload, stringifyPayload } from './serialize.js';
export {
  createHtmlDocument,
  createFallbackHtml,
  createErrorHtml,
  escapeHtml,
  escapeAttr,
  validateHtmlStructure,
} from './html.js';
export type {
  RenderContext,
  User,
  Workspace,
  HydrationPayload,
  RenderOptions,
  DocumentOptions,
} from './types.js';
