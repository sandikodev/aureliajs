# `@aureliajs/ssr`

**Pure, Web-Standards Server-Side Rendering & HTML5 Hydration Core Engine for Aurelia 2.**

[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88)](https://aurelia.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Community Note:** `@aureliajs/ssr` is an independent community SSR engine built on top of Aurelia 2's real low-level runtime primitives (`@aurelia/runtime-html` and `@aurelia/platform-browser`). Every internal mechanism and current trade-off is documented openly below so contributors can inspect, trust, and improve it together.

---

## 1. Scope & Strict Boundaries

### What `@aureliajs/ssr` OWNS
- Rendering genuine Aurelia 2 Custom Elements to HTML on the server (`renderAurelia`, `renderToString`).
- Per-request DOM & DI container isolation with deterministic teardown (`app.stop()`, `app.dispose()`, `dom.window.close()`).
- Real Aurelia 2 hydration marker generation via `@aurelia/runtime-html`'s `ISSRContext`.
- XSS-safe, circular-reference-safe JSON state serialization (`serializeState`, `stringifyPayload`).
- HTML5 document & streaming shell generation (`createDocumentShell`, `createHydrationScript`, `createHtmlDocument`).
- Isomorphic typed DI request context (`IRequestContext`, `resolveRequestContext<TContext>()`).
- Browser-only client hydration bootstrap (`@aureliajs/ssr/client` — zero `jsdom` or `node:*` imports).

### What `@aureliajs/ssr` Explicitly DOES NOT OWN
- HTTP framework routing, middlewares, auth guards, or static asset serving (see [`@hono/aurelia`](../hono-aurelia/README.md)).
- Selective hydration triggers (`visible`, `idle`, `interaction`, `media`) or Zero-JS island loaders (see [`@aureliajs/islands`](../aurelia-islands/README.md)).
- Foreign framework adapters (see [`@aureliajs/bridge`](../aurelia-bridge/README.md)).
- Application DTOs, sessionStorage caches, opinionated error HTML templates, or key-guessing secret redaction.

---

## 2. How Aurelia 2 Works Under the Hood (and the Real Web Chaos Solved Here)

Unlike React or Svelte, Aurelia 2 compiles HTML templates directly into live DOM nodes and binds them through an Inversion of Control (IoC) Dependency Injection container. Running that cleanly on a concurrent HTTP server hits four real-world pitfalls that `@aureliajs/ssr` explicitly solves:

### A. Zero `globalThis` Pollution via Per-Container `BrowserPlatform(win)`
Many naive SSR wrappers monkey-patch `globalThis.window`, `globalThis.document`, and `globalThis.HTMLElement` with JSDOM globals. Under concurrent HTTP traffic, Request A mutates the globals Request B is reading.

**How `@aureliajs/ssr` solves it ([src/render.ts](./src/render.ts)):**
Aurelia 2's `@aurelia/runtime-html` resolves DOM APIs through its `IPlatform` DI token — it does **not** need `globalThis.document`. For every render call, `@aureliajs/ssr`:
1. Instantiates a fresh `new JSDOM(...)`.
2. Creates an isolated `DI.createContainer()`.
3. Registers `new BrowserPlatform(dom.window)` against `IPlatform` inside that container only.
4. Tears down `app.stop()`, `app.dispose()`, and `dom.window.close()` inside `finally`.

Result: **30+ concurrent SSR renders run safely in parallel with zero global mutation.**

### B. Fixing Cross-Document Template Cache Contamination (`AUR0757`)
Aurelia 2's default `TemplateElementFactory` caches parsed `<template>` DOM elements across renders. In a single browser tab that's great; on a server where each request owns a separate JSDOM `Document`, reusing a `<template>` node created by a previous JSDOM document triggers `AUR0757`.

**How `@aureliajs/ssr` solves it:**
Each render container registers a request-scoped `SsrTemplateElementFactory` against `ITemplateElementFactory` that always creates `<template>` nodes from the active container's `IPlatform.document`.

### C. Real `ISSRContext` & `<!--au-->` Markers
Instead of faking SSR with regex `{{prop}}` replacement, `@aureliajs/ssr` registers the real `ISSRContext` token from `@aurelia/runtime-html`:
- `preserveMarkers: true` (default) preserves Aurelia 2's `<!--au-->` comment markers required for native `app.hydrate({ host, component, ssrScope })`.
- `preserveMarkers: false` emits clean marker-free HTML (useful for static snapshots, emails, or HTML inspection).

### D. HTML5 Inert `<script type="application/json">` Instead of `window.__HYDRATION__`
Global script assignments (`window.__HYDRATION__ = ...`) trigger inline-script CSP restrictions and leak into the global namespace. `@aureliajs/ssr` follows HTML5 data-block conventions:
```html
<script id="__AURELIA_SSR_DATA__" type="application/json">{"component":"...","context":{...}}</script>
```
- Inert by browser specification (never executed as JS; compatible with strict CSP without `unsafe-inline`).
- Escapes `<`, `>`, `&`, `\u2028`, `\u2029` so untrusted strings cannot break out of `</script>`.
- Consumed once on the client and removed from the DOM by `hydrateFromServer()`.

---

## 3. Installation

```bash
bun add @aureliajs/ssr aurelia
```

Peer dependencies: `aurelia` (`^2.0.0-rc.2`). Optional peers: `@aurelia/runtime-html`, `@aurelia/platform-browser` (bundled with `aurelia`).

---

## 4. Usage

### Server-Side Rendering (`@aureliajs/ssr/server`)

```ts
import {
  renderAurelia,
  serializeState,
  createHtmlDocument,
} from '@aureliajs/ssr/server';
import { ProfilePage } from './pages/profile-page.js';

interface AppContext {
  locale: string;
}

const bodyHtml = await renderAurelia<ProfilePage, AppContext>({
  component: ProfilePage,
  props: { username: 'sandiko' }, // Type-checked against ComponentProps<ProfilePage>
  context: { locale: 'en-US' },
  url: '/users/sandiko',
  params: { id: 'sandiko' },
  query: { tab: 'activity' },
  timeout: 5000,
});

const payload = await serializeState(
  { locale: 'en-US' },
  { username: 'sandiko' },
  'profile-page',
  {
    // Standard JSON replacer for explicit redaction/transforms if desired
    replacer: (key, value) => (key === 'secret' ? undefined : value),
  }
);

const html = createHtmlDocument(bodyHtml, payload, {
  title: 'Profile — Aurelia 2 SSR',
  cssBundle: '/assets/app.css',
  jsBundle: '/assets/client.js',
  nonce: 'per-request-csp-nonce',
});
```

### Streaming Document Shell

For HTTP streaming (e.g., Web `ReadableStream`), flush `<head>` before awaiting SSR:

```ts
import {
  createDocumentShell,
  createHydrationScript,
  renderAurelia,
  serializeState,
} from '@aureliajs/ssr/server';

const shell = createDocumentShell({
  title: 'Dashboard',
  cssBundle: '/public/style.css',
  jsBundle: '/public/client.js',
});

// 1. Flush shell.preamble immediately so browser starts fetching CSS/JS
// 2. Await renderAurelia(...) and flush bodyHtml
// 3. Flush createHydrationScript(payload) + shell.postamble
```

### Reading Request Context via Native Aurelia DI (Server + Client)

```ts
import { resolveRequestContext } from '@aureliajs/ssr/client';

interface AppContext {
  locale: string;
}

export class ProfilePage {
  public username = '';
  private readonly req = resolveRequestContext<AppContext>();

  get locale(): string {
    return this.req.data.locale;
  }

  get renderedOn(): string {
    return this.req.isServer ? 'server' : 'client';
  }
}
```

### Client-Side Hydration (`@aureliajs/ssr/client`)

Zero `jsdom` or Node imports in this entrypoint:

```ts
import { createClientHydrator } from '@aureliajs/ssr/client';
import { HomePage } from './pages/home.aux';
import { ProfilePage } from './pages/profile-page.js';

await createClientHydrator({
  components: [HomePage, ProfilePage],
  // Optional: target: 'app-root', maxAge: 30_000, registrations: [...], onHydrated, onError
});
```

Lower-level primitives are also exported for custom bootloaders:
- `hydrateFromServer<TData, TContext>(options?)` — Parses, validates, checks `maxAge`, consumes & removes the `<script>` tag.
- `isHydrationAvailable(scriptId?)` — Non-destructive presence check.
- `peekHydrationPayload(scriptId?)` — Non-destructive JSON read.
- `clearHydration(scriptId?)` — Removes the script tag manually.

---

## 5. Subpath Contract

| Subpath | Runtime Target | Key Exports |
| :--- | :--- | :--- |
| `@aureliajs/ssr` | Node / Bun | All server + client + DI tokens + generic types |
| `@aureliajs/ssr/server` | Server only | `renderAurelia`, `renderToString`, `serializeState`, `stringifyPayload`, `validatePayload`, `createDocumentShell`, `createHydrationScript`, `createHtmlDocument`, `escapeHtml`, `escapeAttr`, `IRequestContext`, `resolveRequestContext` |
| `@aureliajs/ssr/client` | Browser safe (0 JSDOM) | `createClientHydrator`, `hydrateFromServer`, `isHydrationAvailable`, `peekHydrationPayload`, `clearHydration`, `IRequestContext`, `resolveRequestContext`, `DEFAULT_SCRIPT_ID` |

---

## 6. Known Limitations & Open Areas for Community Improvement

We keep these explicit so contributors know where high-impact improvements live:

1. **JSDOM Dependency on Server**: `@aureliajs/ssr/server` currently depends on `jsdom`, which runs cleanly on Node.js and Bun, but is too heavy for pure V8 isolates like Cloudflare Workers without Node compat. Exploring lighter spec-compliant DOM shims (e.g., `linkedom` / `happy-dom` / custom minimal `IPlatform` SSR DOM) behind a pluggable `DOMAdapter` interface is an open research area.
2. **Full `ssrScope` Manifest Emission**: `createClientHydrator` already calls Aurelia 2's native `app.hydrate({ host, component, ssrScope })` when `payload.ssrScope` is present, and falls back gracefully to adopting/mounting when absent. Capturing and serializing Aurelia 2's full `ISSRScope` tree during `renderAurelia()` (as Aurelia 2's SSR manifest format stabilizes toward 2.0 GA) is a top priority contribution area.
3. **Async Data / Router Pre-Resolution**: `renderAurelia()` supports a `settle` hook (`microtask` / custom async callback) for components that trigger microtask work during `attaching`, while route loaders stay explicitly outside the render loop (in your HTTP adapter like `@hono/aurelia`).

---

## 7. Testing

```bash
cd packages/aurelia-ssr
bun run build
bun test
```
