/**
 * @aureliajs/ssr
 *
 * Standards-compliant, framework-agnostic SSR & Hydration Core Engine for Aurelia 2.
 */

// Server-side API
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

// Client-side API
export {
  hydrateFromServer,
  isHydrationAvailable,
  peekHydrationPayload,
  clearHydration,
  createClientHydrator,
} from './hydrate.js';

// Pure Generic Types
export type {
  AureliaComponent,
  ComponentProps,
  RenderContext,
  HydrationPayload,
  HydrationResult,
  RenderOptions,
  SSREngine,
  SerializeOptions,
  DocumentShell,
  DocumentOptions,
  DocumentTemplateContext,
  HydrateFromServerOptions,
  ClientHydratorOptions,
  IRequestContext as IRequestContextType,
} from './types.js';

export const VERSION = '0.2.0';
