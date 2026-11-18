/**
 * @aureliajs/ssr Client Entrypoint (zero server / JSDOM dependencies)
 */

export {
  hydrateFromServer,
  isHydrationAvailable,
  peekHydrationPayload,
  clearHydration,
  createClientHydrator,
} from './hydrate.js';
export { IRequestContext, resolveRequestContext } from './tokens.js';
export { DEFAULT_SCRIPT_ID } from './html.js';
export type {
  AureliaComponent,
  ComponentProps,
  RenderContext,
  HydrationPayload,
  HydrationResult,
  HydrateFromServerOptions,
  ClientHydratorOptions,
  IRequestContext as IRequestContextType,
} from './types.js';
