/**
 * @aureliajs/ssr Client Hydration
 *
 * Pure HTML5-standard, strictly typed client hydration primitives for Aurelia 2.
 * Reads state from inert `<script type="application/json" id="__AURELIA_SSR_DATA__">`
 * elements — zero `window` global pollution and zero server/JSDOM dependencies.
 */

import { Aurelia, CustomElement, Registration, type Constructable } from 'aurelia';
import type {
  ClientHydratorOptions,
  HydrateFromServerOptions,
  HydrationPayload,
  HydrationResult,
  IRequestContext as IRequestContextData,
} from './types.js';
import { IRequestContext, resolveRequestContext } from './tokens.js';
import { DEFAULT_SCRIPT_ID } from './html.js';

export { IRequestContext, resolveRequestContext };
export type { HydrationResult, ClientHydratorOptions, HydrateFromServerOptions };

function findScriptElement(scriptId: string): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(scriptId);
  if (!el || el.tagName.toUpperCase() !== 'SCRIPT') return null;
  return el as HTMLScriptElement;
}

function validatePayload(payload: unknown): asserts payload is HydrationPayload {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('Hydration payload must be a JSON object');
  }

  const obj = payload as Record<string, unknown>;

  if (typeof obj.component !== 'string') {
    throw new TypeError('Hydration payload.component must be a string');
  }

  if (!obj.context || typeof obj.context !== 'object') {
    throw new TypeError('Hydration payload.context must be an object');
  }

  if (typeof obj.timestamp !== 'number' || obj.timestamp <= 0) {
    throw new TypeError('Hydration payload.timestamp must be a positive number');
  }

  if (obj.initialData !== undefined && typeof obj.initialData !== 'object') {
    throw new TypeError('Hydration payload.initialData must be an object if provided');
  }
}

/**
 * Check if an HTML5 JSON hydration script element exists without consuming it.
 */
export function isHydrationAvailable(scriptId = DEFAULT_SCRIPT_ID): boolean {
  const el = findScriptElement(scriptId);
  return Boolean(el && el.textContent && el.textContent.trim().length > 0);
}

/**
 * Parse and return the raw hydration payload without removing the `<script>` element.
 */
export function peekHydrationPayload<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(scriptId = DEFAULT_SCRIPT_ID): HydrationPayload<TContext, TData> | undefined {
  const el = findScriptElement(scriptId);
  if (!el || !el.textContent) return undefined;
  return JSON.parse(el.textContent) as HydrationPayload<TContext, TData>;
}

/**
 * Remove the JSON hydration `<script>` element from the DOM.
 */
export function clearHydration(scriptId = DEFAULT_SCRIPT_ID): void {
  findScriptElement(scriptId)?.remove();
}

/**
 * Extract, validate, and consume the server-rendered hydration payload
 * from `<script id="__AURELIA_SSR_DATA__" type="application/json">`.
 */
export function hydrateFromServer<
  TData = Record<string, unknown>,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(options?: HydrateFromServerOptions): HydrationResult<TData, TContext> | null {
  const scriptId = options?.scriptId ?? DEFAULT_SCRIPT_ID;
  const maxAge = options?.maxAge ?? 30_000;

  const el = findScriptElement(scriptId);
  if (!el || !el.textContent) {
    return null;
  }

  const parsed: unknown = JSON.parse(el.textContent);
  validatePayload(parsed);

  const payload = parsed as HydrationPayload<TContext, TData>;
  const age = Date.now() - payload.timestamp;

  if (age > maxAge) {
    console.warn(
      `Hydration payload is stale (age: ${age}ms, max: ${maxAge}ms). Falling back to client state.`
    );
    return null;
  }

  // Consume once by removing the inert script node from the DOM
  el.remove();

  return {
    component: payload.component,
    context: payload.context,
    initialData: payload.initialData,
    ssrScope: payload.ssrScope,
    timestamp: payload.timestamp,
  };
}

function indexComponents(
  components: readonly Constructable[] | Readonly<Record<string, Constructable>>
): ReadonlyMap<string, Constructable> {
  const map = new Map<string, Constructable>();

  if (Array.isArray(components)) {
    for (const comp of components) {
      const className = comp.name;
      const defName = CustomElement.isType(comp)
        ? CustomElement.getDefinition(comp).name
        : className;
      if (defName) map.set(defName, comp);
      if (className) map.set(className, comp);
    }
    return map;
  }

  for (const [key, comp] of Object.entries(components)) {
    map.set(key, comp);
    if (CustomElement.isType(comp)) {
      map.set(CustomElement.getDefinition(comp).name, comp);
    }
  }
  return map;
}

function resolveHostElement(target?: string | HTMLElement): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (target && typeof target !== 'string') return target;
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }
  return (
    document.querySelector<HTMLElement>('app-root') ??
    document.getElementById('ssr-root') ??
    document.body
  );
}

/**
 * Strictly typed client-side hydration bootstrapper for Aurelia 2 SSR.
 *
 * Reads the HTML5 JSON hydration payload, registers `IRequestContext<TContext>`
 * in Aurelia's DI container, resolves the matching Custom Element class, injects
 * `initialData` props, and hydrates (or boots) on the target host element.
 */
export async function createClientHydrator<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TData = Record<string, unknown>,
>(options: ClientHydratorOptions<TContext, TData>): Promise<object | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const hydration = hydrateFromServer<TData, TContext>({
    scriptId: options.scriptId,
    maxAge: options.maxAge,
  });

  const host = resolveHostElement(options.target);
  if (!host) {
    const error = new Error(
      `[createClientHydrator] Target host element "${typeof options.target === 'string' ? options.target : 'app-root'}" not found.`
    );
    options.onError?.(error);
    return null;
  }

  const registry = indexComponents(options.components);
  const componentName = hydration?.component ?? '';
  const ComponentClass = (componentName ? registry.get(componentName) : undefined) ?? options.fallback;

  if (!ComponentClass) {
    const error = new Error(
      `[createClientHydrator] No component registered for "${componentName}". Available: ${Array.from(registry.keys()).join(', ')}`
    );
    options.onError?.(error);
    return null;
  }

  try {
    const app = new Aurelia();

    const requestContext: IRequestContextData<TContext> = {
      data: (hydration?.context ?? {}) as TContext,
      url: window.location?.href ?? 'http://localhost/',
      params: {},
      query: window.location
        ? Object.fromEntries(new URLSearchParams(window.location.search))
        : {},
      isServer: false,
      isClient: true,
    };

    app.register(Registration.instance(IRequestContext, requestContext));

    if (options.registrations && options.registrations.length > 0) {
      app.register(...options.registrations);
    }

    if (hydration?.ssrScope) {
      const root = await app.hydrate({
        host,
        component: ComponentClass,
        ssrScope: hydration.ssrScope,
      });
      const instance = root.controller.viewModel as object;
      if (hydration.initialData && typeof hydration.initialData === 'object') {
        Object.assign(instance, hydration.initialData);
      }
      options.onHydrated?.(componentName || ComponentClass.name, instance, hydration);
      return instance;
    }

    const rootInstance = app.container.get(ComponentClass) as object;
    if (hydration?.initialData && typeof hydration.initialData === 'object') {
      Object.assign(rootInstance, hydration.initialData);
    }

    // Cleanly replace static SSR HTML nodes in the host container to prevent duplicate rendering
    host.replaceChildren();

    await app.app({ host, component: rootInstance }).start();
    options.onHydrated?.(componentName || ComponentClass.name, rootInstance, hydration);
    return rootInstance;
  } catch (err) {
    options.onError?.(err);
    throw err;
  }
}
