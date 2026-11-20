# Aurelia 2 Universal Polyglot Bridge & Hypermedia Showcase

> **Zero Manual Glue-Code. Pure Convention over Configuration. Full-Spectrum Polyglot Interoperability.**  
> Demonstrating how `@aureliajs/bridge` replaces fragile manual wrapper components with declarative, type-safe, container-scoped bridge bindings across **React 19, Vue 3, Svelte 5, SolidJS, Preact, Qwik, and HTMX 2.0**.

[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88)](https://aurelia.io)
[![Vite 8](https://img.shields.io/badge/Vite-8%20Oxc-646CFF)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Architectural Motivation: Eliminating Manual Wrapper Overhead

The official Aurelia 2 guides for hosting foreign components (*"React inside Aurelia"*, *"Vue inside Aurelia"*, *"Svelte inside Aurelia"*) instruct developers to hand-craft bespoke wrapper components:
- Authoring repetitive boilerplate files: `react-wrapper.ts`, `vue-wrapper.ts`, `svelte-wrapper.ts`.
- Manually handling imperative framework lifecycles: `createRoot`, `flushSync`, `shallowReactive`, `markRaw`, `mount()`, and `unmount()`.
- Synchronizing bidirectional reactive state through imperatively attached listeners and custom change events.

In this showcase, **all manual glue code is 100% eliminated**:

```html
<!-- Single Declarative Aurelia Element mounts any supported foreign runtime -->
<au-bridge 
  using="react" 
  component.bind="ReactCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="vue" 
  component.bind="VueCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="svelte" 
  component.bind="SvelteCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="solid" 
  component.bind="SolidCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="preact" 
  component.bind="PreactCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="qwik" 
  component.bind="QwikCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<!-- Pure Hypermedia Component via au-htmx -->
<htmx-card></htmx-card>
```

---

## 2. Key Architecture Pillars

### A. 7 Frontend Technologies Orchestrated Concurrently
This example mounts seven distinct UI paradigms inside a single Aurelia 2 application:
1. **React 19.3 Component**: Functional component utilizing VDOM runtime (`src/components/frontend/counter.react.tsx`).
2. **Vue 3.5 SFC Component**: Pure Single-File Component using reactive props (`src/components/frontend/counter.vue`).
3. **Svelte 5 Runes Component**: Compiler-driven reactivity using `$state` and `$effect` (`src/components/frontend/counter.svelte`).
4. **SolidJS 1.9 JSX Component**: Fine-grained signal reactivity without Virtual DOM overhead (`src/components/frontend/counter.solid.tsx`).
5. **Preact 11.2 Component**: Ultra-lightweight (3 KB) functional VDOM runtime (`src/components/frontend/counter.preact.tsx`).
6. **Qwik 1.20 Component**: Resumable JSX component with serializable QRL event boundaries (`src/components/frontend/counter.qwik.tsx`).
7. **HTMX 2.0 Component (`htmx.html`)**: Pure HTML hypermedia component powered by the `au-htmx` custom attribute (`src/components/frontend/htmx.html`).

### B. Orthogonal Composition with `@aureliajs/islands`
When combined with [`@aureliajs/islands`](../../packages/aurelia-islands), foreign library runtimes (such as React 19 or Vue 3) are **neither downloaded nor mounted** until triggered in the client browser:

```html
<!-- Zero foreign bundle download until element enters the viewport (IntersectionObserver) -->
<au-bridge 
  island="visible" 
  using="react" 
  loader.bind="() => import('./heavy-chart.react')" 
  props.bind="chartData">
</au-bridge>

<!-- Defer mounting until the browser main thread is idle (requestIdleCallback) -->
<au-bridge 
  island="idle" 
  using="vue" 
  component.bind="ChatWidget" 
  props.bind="userSession">
</au-bridge>

<!-- Mount conditionally based on CSS Media Query evaluation -->
<au-bridge 
  island="media" 
  data-au-media="(min-width: 1024px)" 
  using="svelte" 
  component.bind="DesktopSidebar">
</au-bridge>
```

> **Architectural Boundary Principle**:
> - `@aureliajs/bridge` is responsible for **component interoperability** (*what* foreign runtime is mounted and *how* bidirectional state is synchronized).
> - `@aureliajs/islands` is responsible for **selective hydration scheduling** (*when* and *under what conditions* hydration occurs).
> - The two modules remain strictly decoupled while composing seamlessly through Aurelia's template compiler.

### C. Native Hypermedia Integration (`au-htmx`)
For hypermedia-driven interfaces, `@aureliajs/bridge` provides the `au-htmx` Custom Attribute:

```html
<!-- Enhances host DOM element with HTMX processing without wrapper <div> elements -->
<div class="framework-card htmx-card" au-htmx>
  <button 
    class="btn-framework btn-htmx" 
    hx-get="/api/htmx-demo" 
    hx-target="#htmx-card-response" 
    hx-swap="innerHTML">
    ⚡ Fetch Server Fragment (hx-get)
  </button>
  <div id="htmx-card-response" class="htmx-card-response">
    <span>Ready to load hypermedia from server...</span>
  </div>
</div>
```

### D. Synchronous Two-Way Reactive State Synchronization
Bidirectional communication functions transparently across framework boundaries:
- **Aurelia Host → Foreign Subtree**: Binding `value.bind="sharedCounter"` or `props.bind="{ ... }"` synchronizes host state changes into the foreign component via `adapter.update(nextProps)`.
- **Foreign Subtree → Aurelia Host**: Button clicks inside React, Vue, Svelte, Solid, Preact, or Qwik trigger `onCounterChange`, `onChange`, or emit custom events, immediately updating the Aurelia ViewModel and propagating updates across all peer components in the same render frame.

### E. Enterprise Inversion of Control (IoC) & Dependency Injection
Demonstrates hierarchical Dependency Injection using Aurelia's `@resolve(IEnterpriseOrderService)` API, aligning frontend service architectures with backend standards like Spring Boot (`@Autowired`), ASP.NET Core (`[Inject]`), and NestJS:

```ts
import { customElement, resolve } from 'aurelia';
import { IEnterpriseOrderService } from './services/enterprise-order.service';

@customElement({ name: 'my-app', template })
export class MyApp {
  // Injected service singleton via Aurelia IoC Container
  private orderService = resolve(IEnterpriseOrderService);

  public orders = this.orderService.getOrders();
}
```

---

## 3. Directory Structure

```
examples/aurelia-bridge/
├── index.html                           # Host HTML shell with inline SVG favicon
├── package.json                         # Project dependencies and build scripts
├── tsconfig.json                        # Strict TypeScript compiler options
├── vite.config.ts                       # Vite 8 config with polyglot transforms & mock HTMX route
└── src/
    ├── main.ts                          # Application bootstrap registering BridgeConfiguration
    ├── env.d.ts                         # Type definitions for Vue, Svelte, and HTML modules
    ├── style.css                        # Modern CSS Grid styling & framework themes
    ├── my-app.ts                        # Root ViewModel orchestrating DI services & shared counter
    ├── my-app.html                      # Root HTML template with 7-framework polyglot grid
    ├── converters/
    │   └── format-number.ts             # Number formatting ValueConverter (e.g. currency)
    ├── services/
    │   └── enterprise-order.service.ts  # Injectable order management singleton service
    └── components/
        ├── order-item.ts                # Aurelia Custom Element ViewModel for order items
        ├── order-item.html              # Template for order item cards
        └── frontend/                    # Pure polyglot frontend components:
            ├── counter.react.tsx        # React 19 functional component
            ├── counter.vue              # Vue 3 SFC component
            ├── counter.svelte           # Svelte 5 Runes component
            ├── counter.solid.tsx        # SolidJS JSX component
            ├── counter.preact.tsx       # Preact lightweight component
            ├── counter.qwik.tsx         # Qwik resumable component
            └── htmx.html                # Pure HTMX hypermedia component
```

---

## 4. End-to-End Reproduction & Execution Guide

### Prerequisites
- [Bun](https://bun.sh) (v1.2+ recommended) or Node.js (v20+)

### Step 1: Install Dependencies
Run from the repository root:
```bash
bun install
```

### Step 2: Build All Monorepo Core Packages
Ensure all workspaces are compiled and up to date:
```bash
bun run build
```

### Step 3: Run Type Checking
Verify strict TypeScript compilation across all workspaces:
```bash
bun run typecheck
```

### Step 4: Run the Complete Test Suite
Verify that all 158 monorepo unit and integration tests pass:
```bash
bun test && bun test packages/hono-aurelia
```

### Step 5: Start the Polyglot Development Server
Launch the Vite development server:
```bash
bun run --cwd examples/aurelia-bridge dev
```

Open `http://localhost:5173` in your browser.

### Step 6: Verify Production Build
Build the production bundle and verify zero bundling errors:
```bash
bun run --cwd examples/aurelia-bridge build
```

---

## 5. Troubleshooting & FAQ

### Q: Why do foreign frameworks require `polyglotBridgePlugin` in `vite.config.ts`?
A: Aurelia uses `@aurelia/vite-plugin` for HTML conventions and standard decorators. To allow Vue SFCs, Svelte Runes, and Solid JSX to compile within the same Vite environment without full multi-framework plugin conflicts, `polyglotBridgePlugin` processes `.vue`, `.svelte`, and `.solid.tsx` files in `enforce: 'pre'` before passing transformed ES modules to Vite's pipeline.

### Q: How is Qwik serialized when passing callbacks from Aurelia?
A: Qwik requires callback boundaries to be serializable QRLs. `@aureliajs/bridge`'s Qwik adapter automatically wraps incoming callbacks with `qwik.inlinedQrl()` when running in a Qwik environment, preventing QRL serialization errors.

### Q: How does SolidJS receive updates without re-mounting?
A: The Solid adapter sets up an internal reactive signal and passes a Proxy to the Solid component. When Aurelia updates `props`, the adapter calls `setProps(nextProps)`, which triggers Solid's fine-grained computation without unmounting or re-rendering the DOM tree.

---

## 6. License

MIT © [Sandikodev](https://github.com/sandikodev)
