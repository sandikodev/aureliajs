---
name: aurelia-framework-architect
description: "Core mental model, architectural principles, and engineering reference for Framework Maintainers, Meta-Framework Builders, and Systems Engineers developing @hono/aurelia-ssr, @aureliajs/ssr, and @aureliajs/vite-plugin-aux. Use when building compilers, SSR runtimes, hydration engines, execution boundaries, and thin adapters."
---

# Aurelia Framework Architect (Framework & Meta-Framework Engineering Skill)

> **Lens & Posture:** You are a **Framework Core Maintainer & Meta-Framework Architect**. You do not build end-user CRUD applications; you build the runtime foundations, compilers, and adapters that thousands of fullstack developers rely upon. Your focus is on **thin adapters, zero dual-package hazard, strict subpath export boundaries, concurrency safety, and compile-time ergonomics**.

---

## 🏛️ The Triad Engine Architecture

The Aurelia 2 + Hono meta-framework is organized into three decoupled, complementary tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Meta-Framework Hierarchy                        │
├────────────────────────────────────────────────────────────────────────┤
│  1. @aureliajs/ssr (Engine Layer)                                      │
│     - Pure Aurelia 2 SSR engine, framework-agnostic.                   │
│     - JSDOM isolated environment, RenderMutex FIFO concurrency lock.   │
│     - Environment snapshot/restore (globals, window, localStorage).     │
│     - State serialization & anti-XSS JSON stringification.             │
│     - Core client hydrator (createClientHydrator) with DI activation.  │
├────────────────────────────────────────────────────────────────────────┤
│  2. @hono/aurelia-ssr (Adapter & Integration Layer)                    │
│     - Submodule at packages/hono-aurelia-ssr (git submodule).          │
│     - Thin adapter for Hono HTTP framework.                            │
│     - Content negotiation (HTML vs JSON Accept header priority).       │
│     - Co-located loader execution (static loader(c) / loaders).        │
│     - Static auth guards (static requiresAuth = true).                 │
│     - Streaming chunked responses (Transfer-Encoding: chunked).        │
│     - Strict subpath exports: '.' (all), './server', './client'.       │
├────────────────────────────────────────────────────────────────────────┤
│  3. @aureliajs/vite-plugin-aux (Compiler & Toolchain Layer)            │
│     - Vite/Rollup and esbuild plugin for Single-File Components (.aux).│
│     - Depth-tracked template parser (supports nested <template>).      │
│     - <script setup> AST transform with auto-inferred @bindable.       │
│     - Scoped CSS processor (deterministic hash 'au-xxxx').             │
│     - Execution boundaries: <template server-only> & client-only.      │
│     - Co-located <script server>: preserved in SSR, stripped on client.│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📜 The Framework Commandments

1. **Keep `@aureliajs/ssr` Completely Framework-Agnostic**:
   - Never import `hono` or Express into `@aureliajs/ssr`.
   - The core SSR engine accepts standard `RenderOptions` (`component`, `context`, `props`, `url`) and returns HTML strings or payloads.
2. **Never Leak Server-Side DOM or Secrets into `./client`**:
   - In `@hono/aurelia-ssr/client`, export **only** lightweight hydration primitives (`createClientHydrator`, `hydrateFromServer`, `peekHydrationPayload`).
   - If `JSDOM` or `node:fs` ends up in `./client`, client bundles will explode by 2MB and crash in browser runtimes.
3. **Container Activation Must Precede Component Resolution**:
   - In Aurelia 2, calling `new ComponentClass()` or resolving tokens before container registration triggers `AUR0016:no_active_container_for_resolve`.
   - Always initialize the DI container, register tokens (`IRequestContextToken`), and then resolve instances via `app.container.get(ComponentClass)`.
4. **Guard Against Dual-Package Hazard**:
   - Multiple versions of `@aurelia/kernel` or `@aurelia/runtime` across pnpm stores cause `resolve()` to look up null module-scoped variables.
   - Enforce peer dependencies on `aurelia: "^2.0.0"` and prefer assigning props directly onto instances.
5. **Protect Global State with Mutex Locks**:
   - Because Aurelia 2 mutates module-level `PLATFORM` globals during rendering, concurrent Node.js SSR calls will cross-contaminate if not synchronized.
   - Always use `RenderMutex` FIFO queue around the JSDOM boot, render, and snapshot restoration critical section.

---

## 🔧 Internal Engineering Guide

### 1. Handling CustomElement Metadata in Aurelia 2
When resolving component tag names or definitions, never inspect `(comp as any).name` directly (it returns the minified JS class identifier). Always use:
```typescript
import { CustomElement } from 'aurelia';

export function resolveTagName(component: unknown): string {
  if (typeof component === 'function' && CustomElement.isType(component)) {
    return CustomElement.getDefinition(component).name;
  }
  if (typeof component === 'object' && component !== null && component.constructor && CustomElement.isType(component.constructor)) {
    return CustomElement.getDefinition(component.constructor).name;
  }
  return (component as Record<string, unknown>)?.name as string || 'custom-element';
}
```

### 2. Execution Boundaries (`clientOnly` & `serverOnly`)
- **Client-Only Islands (`clientOnly: true`)**:
  In `renderAurelia`, intercept `isClientOnly` before spawning JSDOM:
  ```typescript
  if (isClientOnly) {
    const tagName = resolveTagName(component);
    return `<div class="au-client-island" data-au-client="${tagName}" style="min-height: 1rem;"><!-- client-only island --></div>`;
  }
  ```
- **Server-Only Islands (`serverOnly: true`)**:
  Pre-render static HTML during SSR. In the client compiler (`isServer: false`), omit the component's JavaScript runtime registration to achieve a 0-byte JS footprint.

### 3. Co-located `<script server>` Stripping
In `@aureliajs/vite-plugin-aux`:
- When `options.isServer === true`:
  Extract exports (`loader`, `requiresAuth`, `title`) and attach them as static properties to the compiled class.
- When `options.isServer === false`:
  **Completely strip the `<script server>` block**. Do not emit imports, variables, or references. This guarantees zero leakage of database queries or private keys to browser bundles.

---

## 🧪 Verification & Stability Standards

Every PR and refactor must satisfy the **Zero Drift Rule**:
1. All 4 packages must compile via `bun run build` with zero TypeScript errors.
2. The entire test suite must pass 100%:
   - `@aureliajs/ssr`: 83+ tests
   - `@hono/aurelia-ssr`: 60+ tests
   - `@aureliajs/vite-plugin-aux`: 28+ tests
   - `packages/ssr-playground`: 34+ tests
3. `bun x oxlint` must report **0 warnings and 0 errors** across all files.
4. Submodules must be committed and pushed to their own remote before the main monorepo pointer is updated.
