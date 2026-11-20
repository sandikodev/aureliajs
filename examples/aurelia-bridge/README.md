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

### B. Bidirectional Lifecycle & Event Protocol
Foreign components are mounted, updated, and destroyed deterministically by `@aureliajs/bridge`'s adapter protocol:

```html
<!-- Direct binding to any foreign component with two-way metric sync -->
<au-bridge 
  using="react" 
  component.bind="ReactCounter" 
  props.bind="{ value: sharedCounter, onChange: handleCounterUpdate }">
</au-bridge>

<!-- Seamlessly orchestrating Vue 3 SFC with isolated local refs -->
<au-bridge 
  using="vue" 
  component.bind="VueCounter" 
  props.bind="{ value: sharedCounter, onChange: handleCounterUpdate }">
</au-bridge>
```

> **Architectural Boundary Principle**:
> - `@aureliajs/bridge` is responsible for **component interoperability** (*what* foreign runtime is mounted, *how* props are bound, and *how* bidirectional events are synchronized).
> - Each foreign component manages its **isolated private state & local DOM refs** independently.
> - Aurelia 2 maintains the **enterprise host state, DI singletons, and cross-framework audit trail**.

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

### D. Architectural Scope & Boundary Delineation

To avoid architectural leakage between the enterprise host and foreign UI libraries, the application strictly separates boundaries:

| Scope Dimension | Aurelia 2 Enterprise Host (`MyApp`) | Foreign Leaf Components (React, Vue, Svelte, Solid, Preact, Qwik) | HTMX 2.0 Component (`htmx.html`) |
| :--- | :--- | :--- | :--- |
| **Primary Domain** | IoC Dependency Injection, enterprise orders, global data services, audit logging | Dedicated UI widgets, micro-interactions, ecosystem design components | Server-rendered hypermedia fragments |
| **State Ownership** | **Shared State Coordinator** (`sharedCounter`, `orders`, `auditTrail`) | **Isolated Private State** (`localStep`, `localClicks`) invisible to Aurelia | Stateless on client; state is maintained on server |
| **DOM Manipulation** | **Host-Level Container DOM** (`polyglotGridRef` glow pulse, host banners) | **Local Framework DOM Manipulation** (React `useRef`, Vue template refs, Svelte bindings, Solid refs) | Native browser HTML swapping via `innerHTML` / `outerHTML` |
| **Inter-Framework Sync** | Broadcasts changes down to all children via `value.bind` or `props.bind` | Invokes `onChange(nextValue)` to update host and propagate to peer frameworks | Emits standard HTTP requests and DOM events |

### E. Synchronous Two-Way Reactive State Synchronization
Bidirectional communication functions transparently across framework boundaries:
- **Aurelia Host → Foreign Subtree**: Binding `value.bind="sharedCounter"` or `props.bind="{ ... }"` synchronizes host state changes into the foreign component via `adapter.update(nextProps)`.
- **Foreign Subtree → Aurelia Host**: Button clicks inside React, Vue, Svelte, Solid, Preact, or Qwik trigger `onChange(nextValue)`, immediately updating the Aurelia ViewModel, logging to the real-time audit trail, and propagating updates across all peer components in the same render frame.
- **Aurelia Host Broadcasts**: Host controls (`broadcastSurge(+10)`, `broadcastReset()`) demonstrate how Aurelia can synchronously update all 7 frameworks simultaneously from the host layer.

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

### Q: How does polyglot compilation work with `@aureliajs/bridge/vite`?
A: Rather than forcing developers to configure Babel, Vue SFC compilers, and Svelte compilers manually in userland, the official `@aureliajs/bridge/vite` plugin encapsulates all compilation logic. Adding `bridge()` in `vite.config.ts` automatically transforms `.vue` SFCs, `.svelte` runes, and `.solid.tsx` JSX files on-the-fly, injects Vue runtime feature flags, pre-bundles polyglot dependencies, and serves dev mock endpoints.

### Q: How is Qwik serialized when passing callbacks from Aurelia?
A: Qwik requires callback boundaries to be serializable QRLs. `@aureliajs/bridge`'s Qwik adapter automatically wraps incoming callbacks with `qwik.inlinedQrl()` when running in a Qwik environment, preventing QRL serialization errors.

### Q: How does SolidJS receive updates without re-mounting?
A: The Solid adapter sets up an internal reactive signal and passes a Proxy to the Solid component. When Aurelia updates `props`, the adapter calls `setProps(nextProps)`, which triggers Solid's fine-grained computation without unmounting or re-rendering the DOM tree.

---

## 6. License

MIT © [Sandikodev](https://github.com/sandikodev)
