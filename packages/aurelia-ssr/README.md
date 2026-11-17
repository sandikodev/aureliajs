# @aureliajs/ssr

> **Framework-Agnostic Server-Side Rendering (SSR) & Direct-DOM Hydration Core Engine for Aurelia 2**  
> *Engineered by Sandikodev ([@sandikodev](https://github.com/sandikodev))*

[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88?logo=aurelia)](https://aurelia.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: 81 Passed](https://img.shields.io/badge/Tests-81%20Passed-brightgreen)](https://github.com/sandikodev/aureliajs)

---

## 📌 Executive Summary & Architectural Motivation

Aurelia 2 (`v2.0.0-rc.2`) was engineered with low-level platform abstractions (`@aurelia/platform`, `@aurelia/kernel`, `@aurelia/runtime-html`), but the official team **never released an official `@aurelia/server-side-rendering` package** (NPM returns 404). As a result, the global Aurelia community lacked a first-class, memory-safe SSR and hydration solution comparable to `@vue/server-renderer`, `react-dom/server`, or `svelte/server`.

`@aureliajs/ssr` fills this critical void as the **definitive, framework-agnostic Aurelia 2 SSR engine**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AURELIA 2 APPLICATION                            │
│                  (@customElement, bindables, <au-slot>)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │          @aureliajs/ssr             │
                    │   (Core SSR & Hydration Engine)     │
                    └──────────────────┬──────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│       SERVER-SIDE (@aureliajs/ssr/server)    │ │       CLIENT-SIDE (@aureliajs/ssr/client)    │
│  - JSDOM headless runtime & NodePlatform     │ │  - hydrateFromServer() state extraction     │
│  - SsrTemplateElementFactory (fixes AUR0757) │ │  - Re-activates events & observers on DOM   │
│  - RenderMutex FIFO concurrency lock         │ │  - Zero layout shift (Zero CLS)             │
│  - Strict DI Container stop() & dispose()    │ │  - Lightweight bundle (Zero JSDOM payload)  │
│  - Anti-XSS State Serializer with CSP Nonce  │ │  - Client HydrationCache with TTL           │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
          ┌─────────────────────┐             ┌─────────────────────┐
          │  @hono/aurelia  │             │ Vite / Express /    │
          │    (Hono Adapter)   │             │ Nitro / Fastify     │
          └─────────────────────┘             └─────────────────────┘
```

---

## 🛠️ The 4 Core Engineering Solutions

### 1. Request-Scoped `SsrTemplateElementFactory` (Fixing `AUR0757`)
In concurrent Node/Bun environments, Aurelia 2's default global template compiler factory caches template DOM elements across execution boundaries. When different HTTP requests render components in parallel, this results in fatal `AUR0757: Element template compilation failed`.  
`@aureliajs/ssr` registers a dedicated `SsrTemplateElementFactory` for each render cycle, ensuring clean template cache boundaries.

### 2. Strict DI Container Disposal (Zero Memory Leaks)
Aurelia's Inversion of Control (IoC) DI container retains metadata and instance registries. Without explicit teardown, every HTTP request accumulates megabytes of residual closures.  
Our engine encapsulates component rendering in a strict `try...finally` block that guarantees:
```typescript
await app.stop();
await app.dispose();
```

### 3. FIFO Concurrency Serialization (`RenderMutex`)
Single-threaded DOM abstractions like JSDOM can experience race conditions when multiple microtasks manipulate shared document nodes simultaneously. The built-in `RenderMutex` serializes the DOM compilation critical section safely without blocking I/O.

### 4. Enterprise-Grade State Projection & Anti-XSS
Server-rendered context (`user`, `workspace`, initial loaders) is serialized via `serializeState()`, escaping dangerous HTML delimiters (`<` to `\u003c`, `>` to `\u003e`, `&` to `\u0026`) and attaching optional Content Security Policy (CSP) nonces to `<script nonce="...">`.

---

## 📦 Installation

```bash
# Using bun
bun add @aureliajs/ssr

# Using pnpm
pnpm add @aureliajs/ssr

# Using npm
npm install @aureliajs/ssr
```

*Peer Dependencies: `aurelia` (`^2.0.0-rc.2`)*

---

## 🚀 Usage Guide

### 1. Server-Side Rendering (`@aureliajs/ssr/server`)

You can render components using either `renderToString()` (canonical across modern frameworks) or `renderAurelia()`.

```typescript
import {
  renderToString,
  serializeState,
  createHtmlDocument,
} from '@aureliajs/ssr/server';
import { UserProfileComponent } from './components/user-profile.js';

// Inside your HTTP route handler (Hono, Express, Fastify, Node http):
export async function handleRequest(req, res) {
  const user = { id: 'u_1', name: 'Sandiko', email: 'sandiko@example.com' };
  const initialData = { followers: 1240, posts: 42 };

  // 1. Render Aurelia 2 component to HTML
  const bodyHtml = await renderToString({
    component: UserProfileComponent,
    props: { activeTab: 'overview' },
    context: { user, role: 'Admin' },
  });

  // 2. Safely serialize state for client hydration
  const payload = serializeState(
    { user, role: 'Admin' },
    initialData,
    'user-profile'
  );

  // 3. Generate complete, valid HTML5 document
  const html = createHtmlDocument(bodyHtml, payload, {
    title: 'User Profile - Aurelia 2 SSR',
    cssBundle: '/dist/bundle.css',
    jsBundle: '/dist/client.js',
    nonce: 'rAnd0mN0nc3', // Optional CSP nonce
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}
```

### 2. Client-Side Hydration (`@aureliajs/ssr/client`)

In your browser bundle, import from `@aureliajs/ssr/client`. This bundle contains zero server dependencies (no JSDOM) and weighs less than 2KB gzipped.

```typescript
import Aurelia from 'aurelia';
import { hydrateFromServer } from '@aureliajs/ssr/client';
import { UserProfileComponent } from './components/user-profile.js';

async function bootstrap() {
  const host = document.querySelector('app-root');
  if (!host) return;

  // Extract server-injected state and auth context
  const hydration = hydrateFromServer<{ followers: number; posts: number }>();

  console.log('User:', hydration?.context?.user);
  console.log('Preloaded Data:', hydration?.initialData);

  // Adopt server DOM and attach reactivity
  await Aurelia.app({
    host,
    component: new UserProfileComponent(hydration?.initialData),
  }).start();
}

bootstrap();
```

---

## 📚 API Reference

### Server Module (`@aureliajs/ssr/server`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `renderToString()` | `(options: RenderOptions) => Promise<string>` | Standard SSR method to render component to HTML string. |
| `renderAurelia()` | `(options: RenderOptions) => Promise<string>` | Direct alias for `renderToString()`. |
| `serializeState()` | `(context, initialData?, componentName?) => HydrationPayload` | Securely projects auth context and preloaded data with XSS escaping. |
| `createHtmlDocument()`| `(bodyHtml, payload?, options?: DocumentOptions) => string` | Generates full HTML5 document with DOCTYPE, scripts, and CSP nonce. |
| `createFallbackHtml()`| `(componentName, options?: DocumentOptions) => string` | Minimal HTML shell for client-side fallback mode. |
| `createErrorHtml()` | `(statusCode, message, error?, options?) => string` | Standard server error document for graceful failure handling. |

### Client Module (`@aureliajs/ssr/client`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `hydrateFromServer<T>()`| `(options?: HydrationOptions) => HydrationResult<T> \| null` | Extracts and validates the SSR payload from `window`. |
| `isHydrationAvailable()` | `(payloadKey?: string) => boolean` | Checks if a valid hydration payload is present on the window object. |
| `peekHydrationPayload()` | `(payloadKey?: string) => HydrationPayload \| undefined` | Reads payload without clearing it from the DOM. |
| `clearHydration()` | `(payloadKey?: string) => void` | Removes the hydration payload from the global window object. |
| `HydrationCache` | `class` | In-memory key-value cache with TTL expiration for hydration queries. |

---

## 🤝 Relationship with `@hono/aurelia`

* **`@aureliajs/ssr` (This Package)**: Core rendering and hydration engine. 100% framework-agnostic.
* **`@hono/aurelia`**: Official Hono web adapter built on top of `@aureliajs/ssr`. Adds high-level route handlers (`aurelia()`), Hono context negotiation (`Accept: text/html` vs `application/json`), auth guards, and loaders.

---

## 🧪 Quality & Test Verification

All tests run via Vitest and Bun test:

```bash
bun test packages/aurelia-ssr
# 81 pass, 0 fail, 158 assertions
```

---

## 📄 License

MIT © [Sandiko (@sandikodev)](https://github.com/sandikodev)
