/**
 * @aureliajs/ssr Client Entrypoint
 * 
 * Ultra-lightweight client-side hydration exports for the browser.
 * Zero JSDOM dependency.
 */

export {
  hydrateFromServer,
  isHydrationAvailable,
  peekHydrationPayload,
  clearHydration,
  HydrationCache,
  hydrationCache,
  createClientHydrator,
} from './hydrate.js';
export { IRequestContext } from './tokens.js';
export type {
  RenderContext,
  User,
  Workspace,
  HydrationPayload,
  HydrationOptions,
  HydrationResult,
  ClientHydratorOptions,
  IRequestContext as IRequestContextType,
} from './types.js';
