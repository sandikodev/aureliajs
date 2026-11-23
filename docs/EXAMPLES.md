# Aurelia 2 Ecosystem — Reference Examples & Canonical Showcases

This document provides a comprehensive guide to all canonical reference implementations and showcases within the Aurelia 2 ecosystem.

Following our **Clean-Native Architecture & Submodule Decoupling Strategy**, all reference examples are colocated directly inside their respective packages under `packages/<package-name>/example/`. This ensures:

1. **True Architectural Scoping & Independence**: Each package (`@hono/aurelia`, `@aureliajs/bridge`, `@aureliajs/islands`, `@aureliajs/ssr`, `@aureliajs/vite-plugin-aux`) is an autonomous, publishable Git submodule with its own live, runnable example.
2. **Zero Root Directory Clutter**: The monorepo root directory (`~/project/aureliajs`) remains clean, focused, and free of sprawling demo folders.
3. **Plug-and-Play Developer Experience**: Cloning any single submodule allows developers to immediately run tests and inspect the full working example without having to clone or build the entire monorepo.

---

## 📂 Canonical Examples Directory

| Package / Submodule                                           | Example Location                                                        | Focus & Capabilities                                                                                                 | Tech Stack                                                      | Status              |
| :------------------------------------------------------------ | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :------------------ |
| **[@hono/aurelia](../packages/hono-aurelia)**                 | [packages/hono-aurelia/example](../packages/hono-aurelia/example)       | Fullstack SSR, Web Streams streaming, typed loaders & actions, Cloudflare Worker & Docker deployments                | Hono 4, Aurelia 2, LinkeDOM, Web Streams                        | ✅ Production Ready |
| **[@aureliajs/bridge](../packages/aurelia-bridge)**           | [packages/aurelia-bridge/example](../packages/aurelia-bridge/example)   | Polyglot Micro-Frontend Interop (<au-bridge>) & Hypermedia (`au-htmx`) with React, Vue, Svelte, Solid, Preact & Qwik | Aurelia 2, React 19, Vue 3, Svelte 5, Solid, Preact, Qwik, HTMX | ✅ Production Ready |
| **[@aureliajs/islands](../packages/aurelia-islands)**         | [packages/aurelia-islands/example](../packages/aurelia-islands/example) | True Zero-JS Islands Architecture & Selective Progressive Hydration (`client:visible`, `client:interaction`)         | Aurelia 2, @aureliajs/islands, IntersectionObserver             | ✅ Production Ready |
| **[@aureliajs/ssr](../packages/aurelia-ssr)**                 | [packages/aurelia-ssr/example](../packages/aurelia-ssr/example)         | Framework-Agnostic Aurelia 2 SSR Engine — standalone server rendering without HTTP framework locks                   | Aurelia 2, @aureliajs/ssr, native Bun / Node                    | ✅ Production Ready |
| **[@aureliajs/vite-plugin-aux](../packages/vite-plugin-aux)** | [packages/vite-plugin-aux/example](../packages/vite-plugin-aux/example) | Aurelia 2 Single-File Components (`.aux`) — `<script setup>`, scoped CSS, execution boundaries, and zero boilerplate | Aurelia 2, Vite 8, SWC, Bun                                     | ✅ Production Ready |

---

## 1. 🚀 Fullstack SSR (`packages/hono-aurelia/example`)

Canonical fullstack application demonstrating server-side rendering with Hono and Aurelia 2.

### Highlights

- **Isomorphic Rendering**: Server pre-renders pages (`home`, `post-detail`, `dashboard`) and serializes state into an inert HTML5 `<script type="application/json">` tag.
- **Web Streams**: True progressive streaming SSR via Web Streams (`ReadableStream`) flushes the `<head>` and preambles immediately.
- **Content Negotiation**: Same URL returns HTML5 for browser requests and JSON DTOs for `Accept: application/json` API consumers.
- **Edge Compatible**: Cloudflare Worker bundle compiled with LinkeDOM optimization for sub-millisecond cold starts.
- **Client Hydration via `@hono/aurelia/client`**: Client-side entry points simply import `createClientHydrator` directly from `@hono/aurelia/client`, eliminating the need to directly depend on or configure `@aureliajs/ssr`:

  ```ts
  import { createClientHydrator } from '@hono/aurelia/client';
  import { App } from './app';

  const hydrator = createClientHydrator({ component: App });
  await hydrator.hydrate();
  ```

### Quick Start

```bash
cd packages/hono-aurelia/example
bun install
bun run dev      # Starts dev server on http://localhost:3000
bun test         # Runs fullstack integration tests
```

---

## 2. ⚡ Polyglot Bridge Showcase (`packages/aurelia-bridge/example`)

Comprehensive enterprise demonstration of multi-framework interoperability inside Aurelia 2 without glue code or framework lock-in.

### Highlights

- **Zero-Boilerplate Runtimes**: Seamlessly host components from **React 19**, **Vue 3**, **Svelte 5**, **SolidJS**, **Preact**, and **Qwik** within a unified Aurelia 2 parent view.
- **Bi-Directional Reactivity**: Aurelia's `value.bind` and `on-change.bind` automatically sync with foreign component properties and event emissions.
- **Resumable Qwik Integration**: Pure, idiomatic Qwik components utilizing `component$()`, `useSignal()`, `useTask$()`, and `onClick$={...}` with zero manual DOM manipulation.
- **Hypermedia Support**: Declarative HTMX integration via native Aurelia Custom Attribute `au-htmx`.

### Quick Start

```bash
cd packages/aurelia-bridge/example
bun install
bun run dev      # Launches Vite dev server on http://localhost:5174
bun test         # Executes headless DOM integration tests
```

---

## 3. 🏝️ Zero-JS Islands Architecture (`packages/aurelia-islands/example`)

Demonstration of selective progressive hydration where 95%+ of the page is shipped as pure Zero-JS HTML.

### Highlights

- **0 KB Initial JavaScript**: The page renders complete static HTML on the server; client JavaScript bundles for interactive islands are only fetched when triggered.
- **Flexible Hydration Triggers**:
  - `client:visible`: Hydrates when the element enters the viewport via `IntersectionObserver`.
  - `client:interaction`: Hydrates upon user interaction (click, focus, mouseover).
  - `client:idle`: Hydrates when the browser main thread is idle (`requestIdleCallback`).
  - `client:media`: Hydrates based on CSS media queries (e.g., `(min-width: 768px)`).

### Quick Start

```bash
cd packages/aurelia-islands/example
bun install
bun run dev      # Compiles islands and starts HTTP server on http://localhost:3000
bun test         # Verifies island pre-rendering and hydration contracts
```

---

## 4. 🖥️ Framework-Agnostic SSR Engine (`packages/aurelia-ssr/example`)

Minimalist, unopinionated server rendering pipeline demonstrating how `@aureliajs/ssr` functions without any dependency on Hono, Express, or Fastify.

### Highlights

- **Pure Functional API**: Single entry point `renderAurelia()` mounts the root ViewModel, evaluates templates, and extracts serializable state.
- **XSS-Safe Hydration**: Escapes JSON payloads and avoids global `window` pollution by utilizing DOM `<script type="application/json">` elements.
- **Multi-Runtime**: Compatible with Bun native HTTP (`Bun.serve`), Node.js `http.createServer`, or serverless functions.

### Quick Start

```bash
cd packages/aurelia-ssr/example
bun install
bun run dev      # Starts native Bun SSR server
bun test         # Verifies SSR document generation and memory isolation
```

---

## 5. 🎨 Single-File Components (`packages/vite-plugin-aux/example`)

Showcases the modern `.aux` Single-File Component format for Aurelia 2.

### Highlights

- **`<script setup>` Syntax**: Ergonomic, boilerplate-free script blocks with automatic bindable inference.
- **Scoped Styles**: CSS styles scoped automatically using unique, deterministic `data-scopeId` attributes.
- **Execution Boundaries**: Dedicated `<template client-only>` and `<template server-only>` directives.
- **Co-located Server Loaders**: `<script server>` blocks executed exclusively on the server for data fetching.

### Quick Start

```bash
cd packages/vite-plugin-aux/example
bun install
bun run dev      # Starts Vite HMR dev server
bun test         # Verifies SFC compilation and AST generation
```

---

## 🧪 Running All Tests Across All Packages

To verify all packages and their colocated examples in one command:

```bash
cd packages/aurelia-bridge && bun run test && \
cd ../aurelia-islands && bun test && \
cd ../aurelia-ssr && bun test && \
cd ../hono-aurelia && bun test && \
cd ../vite-plugin-aux && bun test && \
cd ../ssr-playground && bun test
```

---

## 💡 Guidelines for Adding New Examples

1. **Colocate Inside the Owning Package**: Place new showcases in `packages/<package-name>/example/`.
2. **Keep Examples Independent**: Include a standalone `package.json` with scripts (`dev`, `build`, `test`, `typecheck`).
3. **Configure Relative Paths**: Map parent package imports in `tsconfig.json` using relative paths (`"@aureliajs/<pkg>": ["../src/index.ts"]`) so that the example runs both inside the monorepo and when the submodule is cloned independently.
4. **Zero Fluff**: Focus exclusively on clean, idiomatic framework conventions without unnecessary demo bloat.
