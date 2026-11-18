/**
 * @aureliajs/ssr DI Tokens
 *
 * Shared isomorphic DI tokens safe for both server and client execution.
 * Zero JSDOM dependencies.
 */

import { DI, resolve, type IResolver } from 'aurelia';
import type { IRequestContext as IRequestContextData } from './types.js';

export type IRequestContext<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = IRequestContextData<TContext>;

/**
 * Isomorphic Aurelia 2 DI token for request context.
 * Usable with `resolve(IRequestContext)` or the typed `resolveRequestContext<TContext>()` helper.
 */
export const IRequestContext: IResolver<IRequestContextData> =
  /*@__PURE__*/ DI.createInterface<IRequestContextData>(
    'IRequestContext'
  ) as unknown as IResolver<IRequestContextData>;

/**
 * Strongly typed helper to resolve `IRequestContext<TContext>` inside any Aurelia 2
 * component or service without type assertions in application code.
 */
export function resolveRequestContext<
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(): IRequestContextData<TContext> {
  return resolve(IRequestContext) as IRequestContextData<TContext>;
}
