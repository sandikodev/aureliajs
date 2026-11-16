/**
 * @aureliajs/ssr
 * 
 * Framework-agnostic Server-Side Rendering (SSR) and Direct-DOM Hydration
 * Core Engine for Aurelia 2 by sandikodev.
 * 
 * @example Server-side (Node / Bun / Edge shims):
 * ```typescript
 * import { renderToString, serializeState, createHtmlDocument } from '@aureliajs/ssr/server';
 * 
 * const html = await renderToString({
 *   component: MyComponent,
 *   props: { title: 'Aurelia 2 SSR' }
 * });
 * const payload = await serializeState({ user, role }, { data });
 * const doc = createHtmlDocument(html, payload);
 * ```
 * 
 * @example Client-side (Browser):
 * ```typescript
 * import { hydrateFromServer } from '@aureliajs/ssr/client';
 * 
 * const hydration = hydrateFromServer();
 * console.log('Hydrated with:', hydration?.initialData);
 * ```
 */

// Public API - Server-side
export { renderAurelia, renderToString } from './render.js';
export { IRequestContext } from './tokens.js';
export { serializeState, validatePayload, stringifyPayload } from './serialize.js';
export {
  createHtmlDocument,
  createFallbackHtml,
  createErrorHtml,
  escapeHtml,
  escapeAttr,
  validateHtmlStructure,
} from './html.js';

// Public API - Client-side
export {
  hydrateFromServer,
  isHydrationAvailable,
  peekHydrationPayload,
  clearHydration,
  HydrationCache,
  hydrationCache,
  createClientHydrator,
} from './hydrate.js';

// Types
export type {
  RenderContext,
  User,
  Workspace,
  HydrationPayload,
  RenderOptions,
  DocumentOptions,
  HydrationOptions,
  HydrationResult,
  ClientHydratorOptions,
  IRequestContext as IRequestContextType,
} from './types.js';

// Version
export const VERSION = '0.1.0';
