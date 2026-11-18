/**
 * @aureliajs/ssr Server Renderer
 *
 * Pure, platform-scoped Server-Side Rendering engine for Aurelia 2.
 * Uses Aurelia 2's native per-container `BrowserPlatform(win)` and real `ISSRContext`
 * from `@aurelia/runtime-html` — zero `globalThis` monkey-patching, zero global mutexes,
 * zero secret instance mutations.
 */

import {
  Aurelia,
  CustomElement,
  DI,
  IPlatform,
  ITemplateElementFactory,
  Registration,
  resolve,
  type Constructable,
} from 'aurelia';
import { ISSRContext, StandardConfiguration } from '@aurelia/runtime-html';
import { BrowserPlatform } from '@aurelia/platform-browser';
import type { IRequestContext as IRequestContextData, RenderOptions, SSREngine } from './types.js';
import { IRequestContext, resolveRequestContext } from './tokens.js';
import { escapeAttr } from './html.js';

export { IRequestContext, resolveRequestContext };

/**
 * Detect the optimal SSR DOM emulation engine based on the runtime environment:
 * - Detects Cloudflare Workers / `workerd` (via `WebSocketPair` or `Cloudflare` userAgent) -> `'linkedom'`
 * - Defaults to `'jsdom'` on Node.js / Bun.
 */
export function detectDefaultSSREngine(): 'jsdom' | 'linkedom' {
  if (
    typeof (globalThis as unknown as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare')) ||
    (typeof process !== 'undefined' && process.env?.WORKER === 'true')
  ) {
    return 'linkedom';
  }
  return 'jsdom';
}

interface SsrScope {
  win: typeof globalThis;
  host: HTMLElement;
  dispose?: () => void;
}

/**
 * Factory creating an isolated DOM environment using dynamic imports.
 * This guarantees that Edge bundlers (like Cloudflare Wrangler) do not bundle
 * Node's `vm` module when targeting `linkedom`.
 */
async function createSsrScope(
  engine: SSREngine = 'auto',
  url = 'http://localhost/'
): Promise<SsrScope> {
  const resolved = engine === 'auto' ? detectDefaultSSREngine() : engine;

  if (resolved === 'linkedom') {
    const { parseHTML } = await import('linkedom');
    const { window, document } = parseHTML(
      '<!DOCTYPE html><html><body><div id="ssr-root"></div></body></html>'
    );

    // W3C DOM adoptNode & CSSStyleDeclaration getPropertyPriority polyfills for LinkeDOM
    if (!document.adoptNode) {
      (document as unknown as { adoptNode: (node: Node) => Node }).adoptNode = (node: Node) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
        return node;
      };
    }

    const testDiv = document.createElement('div');
    const styleProto = Object.getPrototypeOf(testDiv.style);
    if (styleProto && typeof styleProto.getPropertyPriority !== 'function') {
      styleProto.getPropertyPriority = () => '';
    }

    return {
      win: window as unknown as typeof globalThis,
      host: document.getElementById('ssr-root') as unknown as HTMLElement,
    };
  }

  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="ssr-root"></div></body></html>', {
    url,
    contentType: 'text/html',
    pretendToBeVisual: true,
  });

  return {
    win: dom.window as unknown as typeof globalThis,
    host: dom.window.document.getElementById('ssr-root') as unknown as HTMLElement,
    dispose: () => {
      try {
        dom.window.close();
      } catch {
        // Ignore JSDOM teardown errors
      }
    },
  };
}

/**
 * Request-scoped `ITemplateElementFactory` creating `<template>` nodes directly
 * against the active request's `IPlatform.document`, avoiding cross-document
 * template cache contamination (`AUR0757`) across concurrent SSR requests.
 */
class SsrTemplateElementFactory implements ITemplateElementFactory {
  private readonly platform = resolve(IPlatform);

  public createTemplate(input: unknown): HTMLTemplateElement {
    let raw: string | null = null;

    if (typeof input === 'string') {
      raw = input;
    } else if (
      input &&
      typeof input === 'object' &&
      'index' in input &&
      typeof (input as { index: unknown }).index === 'string'
    ) {
      // Bun HTMLBundle support: { index: '/path/to/template.html' }
      try {
        const fs = typeof process !== 'undefined' ? (globalThis as any).process?.getBuiltinModule?.('node:fs') ?? null : null;
        if (fs?.readFileSync) {
          raw = fs.readFileSync((input as { index: string }).index, 'utf8');
        }
      } catch {
        // fallback
      }
    }

    if (raw !== null) {
      const template = this.platform.document.createElement('template');
      template.innerHTML = raw;
      return template;
    }

    if (input && typeof input === 'object' && 'nodeName' in input) {
      const node = input as Node;
      if (node.nodeName !== 'TEMPLATE') {
        const template = this.platform.document.createElement('template');
        template.content.appendChild(node);
        return template;
      }
      return node as HTMLTemplateElement;
    }

    return this.platform.document.createElement('template');
  }
}

function resolveClientOnlyTag(component: unknown): string {
  if (typeof component === 'function' && CustomElement.isType(component)) {
    return CustomElement.getDefinition(component).name;
  }
  if (
    typeof component === 'object' &&
    component !== null &&
    component.constructor &&
    CustomElement.isType(component.constructor)
  ) {
    return CustomElement.getDefinition(component.constructor).name;
  }
  const named = component as { name?: string } | null;
  return named?.name || 'client-island';
}

function isClientOnlyComponent(component: unknown): boolean {
  if (!component) return false;
  return Boolean((component as { clientOnly?: boolean }).clientOnly);
}

function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolveResult, rejectResult) => {
    const timer = setTimeout(
      () => rejectResult(new Error(`renderAurelia timeout after ${timeoutMs}ms`)),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolveResult(value);
      },
      (err) => {
        clearTimeout(timer);
        rejectResult(err);
      }
    );
  });
}

/**
 * Render an Aurelia 2 component to an HTML string inside an isolated,
 * request-scoped `BrowserPlatform` and DI container.
 */
export async function renderAurelia<
  TComponent extends object = object,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(options: RenderOptions<TComponent, TContext>): Promise<string> {
  const {
    component,
    context = {} as TContext,
    props,
    timeout = 5000,
    registrations,
    settle,
    engine = 'auto',
    preserveMarkers = true,
    url = 'http://localhost/',
    params = {},
    query = {},
  } = options;

  if (!component) {
    throw new Error('renderAurelia: component is required');
  }

  // Client-only island boundary: emit minimal placeholder without spawning DOM
  if (isClientOnlyComponent(component)) {
    const tag = resolveClientOnlyTag(component);
    return `<div class="au-client-island" data-au-client="${escapeAttr(tag)}"></div>`;
  }

  const scope = await createSsrScope(engine, url);
  const platform = new BrowserPlatform(scope.win);
  const container = DI.createContainer();
  const app = new Aurelia(container);

  const requestContext: IRequestContextData<TContext> = {
    data: context,
    url,
    params,
    query,
    isServer: true,
    isClient: false,
  };

  const renderTask = (async (): Promise<string> => {
    app.register(
      StandardConfiguration,
      Registration.instance(IPlatform, platform),
      Registration.singleton(ITemplateElementFactory, SsrTemplateElementFactory),
      Registration.instance(ISSRContext, { preserveMarkers }),
      Registration.instance(IRequestContext, requestContext)
    );

    if (registrations && registrations.length > 0) {
      app.register(...registrations);
    }

    const rootComponent: object =
      typeof component === 'function'
        ? (app.container.get(component as Constructable<TComponent>) as object)
        : component;

    if (props) {
      Object.assign(rootComponent, props);
    }

    const host = scope.host;
    if (!host) {
      throw new Error('renderAurelia: host element #ssr-root not found');
    }

    await app.app({ host, component: rootComponent }).start();

    if (settle && settle > 0) {
      await new Promise((done) => setTimeout(done, settle));
    }

    return host.innerHTML;
  })();

  try {
    return await raceWithTimeout(renderTask, timeout);
  } finally {
    try {
      await app.stop();
    } catch {
      // Ignore stop errors if startup failed or timed out
    }
    try {
      app.dispose();
    } catch {
      // Ignore dispose errors
    }
    scope.dispose?.();
  }
}

/**
 * Standard SSR alias mirroring React/Vue conventions.
 */
export { renderAurelia as renderToString };
