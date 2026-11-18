/**
 * @aureliajs/ssr Types
 *
 * Pure, strictly generic TypeScript contracts conforming to HTML5 Web Standards
 * and Aurelia 2's native DI & SSR runtime primitives.
 */

import type { Constructable } from 'aurelia';
import type { ISSRScope } from '@aurelia/runtime-html';

/**
 * Extracts writable data properties of a component view-model (excluding methods)
 * for compile-time prop type safety during SSR.
 */
export type ComponentProps<T extends object> = Partial<{
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K];
}>;

/**
 * Any valid Aurelia 2 Custom Element class or component instance.
 */
export type AureliaComponent<T extends object = object> = Constructable<T> | T;

/**
 * Generic request-scoped context passed across SSR and client hydration.
 */
export type RenderContext<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T;

/**
 * Hydration payload serialized as HTML5 `<script type="application/json">`.
 */
export interface HydrationPayload<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  readonly component: string;
  readonly context: TContext;
  readonly initialData?: TData;
  readonly ssrScope?: ISSRScope;
  readonly timestamp: number;
}

/**
 * Validated hydration result extracted on the client from the SSR data script.
 */
export interface HydrationResult<
  TData = Record<string, unknown>,
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly component: string;
  readonly context: TContext;
  readonly initialData?: TData;
  readonly ssrScope?: ISSRScope;
  readonly timestamp: number;
}

/**
 * Strictly typed Isomorphic Request Context resolved via Aurelia 2 DI
 * (`resolve(IRequestContext)` or `resolveRequestContext<AppContext>()`).
 */
export interface IRequestContext<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly data: TContext;
  readonly url: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly isServer: boolean;
  readonly isClient: boolean;
}

/**
 * Available server-side DOM emulation engines:
 * - `'jsdom'`: Full DOM implementation backed by Node.js APIs (default on Node/Bun).
 * - `'linkedom'`: Lightweight, pure-JS DOM parser optimized for Edge Isolates (Cloudflare Workers, V8 isolates).
 * - `'auto'`: Automatically detects edge environment (e.g. Cloudflare Workers via `WebSocketPair` or `navigator.userAgent`) and uses `linkedom`, otherwise falls back to `jsdom`.
 */
export type SSREngine = 'jsdom' | 'linkedom' | 'auto';

/**
 * Options for `renderAurelia()` and `renderToString()`.
 */
export interface RenderOptions<
  TComponent extends object = object,
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  component: AureliaComponent<TComponent>;
  props?: ComponentProps<TComponent>;
  context?: TContext;
  timeout?: number;
  registrations?: readonly unknown[];
  settle?: number;
  /** DOM emulation engine to use (`'auto'` | `'jsdom'` | `'linkedom'`). Defaults to `'auto'`. */
  engine?: SSREngine;
  /** Preserve Aurelia 2 `<!--au-->` hydration markers in SSR output (default: `true`). */
  preserveMarkers?: boolean;
  url?: string;
  params?: Readonly<Record<string, string>>;
  query?: Readonly<Record<string, string>>;
}

/**
 * Options for `serializeState()`.
 */
export interface SerializeOptions {
  /**
   * Standard JSON replacer callback invoked for each `(key, value)` pair.
   * Return `undefined` to omit a property from the serialized payload.
   */
  replacer?: (key: string, value: unknown) => unknown;
}

/**
 * Preamble and postamble halves of an HTML document shell for true streaming SSR.
 */
export interface DocumentShell {
  /** Opening HTML through `<head>` and opening root tag — flushed immediately for near-zero TTFB. */
  readonly preamble: string;
  /** Closing root tag, client module scripts, and `</body></html>` — flushed after body + data script. */
  readonly postamble: string;
}

/**
 * Context passed to a custom `DocumentOptions.template` render function.
 */
export interface DocumentTemplateContext<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  readonly body: string;
  readonly head: string;
  readonly hydrationScript: string;
  readonly scripts: string;
  readonly payload: HydrationPayload<TContext, TData>;
  readonly options: DocumentOptions<TContext, TData>;
}

/**
 * Options for `createHtmlDocument()` and `createDocumentShell()`.
 */
export interface DocumentOptions<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  title?: string;
  lang?: string;
  basePath?: string;
  /**
   * Root custom element tag wrapping rendered SSR markup.
   * Defaults to `'app-root'`. Pass `false` or `''` for unwrapped output.
   */
  rootTag?: string | false;
  htmlAttrs?: Readonly<Record<string, string>>;
  bodyAttrs?: Readonly<Record<string, string>>;
  cssBundle?: string | readonly string[];
  jsBundle?: string | readonly string[];
  head?: string;
  /** CSP nonce applied to external module `<script>` tags. */
  nonce?: string;
  /** DOM `id` attribute for the `<script type="application/json">` hydration element. */
  scriptId?: string;
  /**
   * Custom HTML document template string (`<!--app-head-->`, `<!--app-hydration-->`,
   * `<!--app-html-->`, `<!--app-scripts-->`) or render function.
   */
  template?: string | ((ctx: DocumentTemplateContext<TContext, TData>) => string);
}

/**
 * Options for `hydrateFromServer()`.
 */
export interface HydrateFromServerOptions {
  /** DOM `id` of the `<script type="application/json">` element (default: `'__AURELIA_SSR_DATA__'`). */
  scriptId?: string;
  /** Maximum acceptable payload age in ms (default: `30000`). */
  maxAge?: number;
}

/**
 * Strictly typed options for client-side hydration (`createClientHydrator`).
 */
export interface ClientHydratorOptions<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  /** Registered Aurelia Custom Element classes (array or name-keyed dictionary). */
  components: readonly Constructable[] | Readonly<Record<string, Constructable>>;
  /** Target host element or CSS selector (defaults to `'app-root'`). */
  target?: string | HTMLElement;
  /** Fallback component class if no matching SSR component is found. */
  fallback?: Constructable;
  /** Additional Aurelia DI registrations for the client container. */
  registrations?: readonly unknown[];
  /** DOM `id` of the JSON hydration script (default: `'__AURELIA_SSR_DATA__'`). */
  scriptId?: string;
  /** Maximum acceptable payload age in ms (default: `30000`). */
  maxAge?: number;
  onHydrated?: (
    componentName: string,
    instance: object,
    hydration: HydrationResult<TData, TContext> | null
  ) => void;
  onError?: (error: unknown) => void;
}
