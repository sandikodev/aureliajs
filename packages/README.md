# `@aureliajs/*` & `@hono/aurelia` — Open Community Ecosystem Guide

> **Standards-First Fullstack Libraries for Aurelia 2 & Hono**  
> Independent community research & engineering led by **Sandikodev ([@sandikodev](https://github.com/sandikodev))**.

> [!IMPORTANT]
> **Community Transparency Notice:**  
> These packages are an independent open-source community initiative built with deep respect for **Rob Eisenberg, the Aurelia Core Team, and the Hono Core Team**. They are not official releases of the Aurelia Foundation. Every design choice, trade-off, and internal workaround is documented openly so the wider community can inspect, critique, adopt, and improve them together.

---

## 1. Why This Architecture Exists

Aurelia 2 is fundamentally different from React, Vue, or Svelte:
- It does **not** hide the browser behind a Virtual DOM or a closed compiler universe.
- It is designed around **clean Web Standards and TypeScript conventions**: Custom Elements, HTML `<template>`, Dependency Injection (DI) containers, structural Template Controllers, Custom Attributes, and abstract platforms (`IPlatform`).

Yet the real Web platform is notoriously messy:
- Server runtimes (Node, Bun, Workers) have no native DOM, and JSDOM mutates global assumptions easily.
- Aurelia 2's internal rendering caches `<template>` DOM elements across documents if left unguarded (`AUR0757`).
- Fullstack apps need streaming HTML, XSS-safe state handoff, Zero-JS content pages, selective hydration, and gradual migration from React/Vue/Svelte/HTMX — without collapsing into a monolithic meta-framework or leaking application business logic into library code.

This suite solves those real-world Web problems by splitting responsibilities into **small, orthogonal, strictly typed packages**.

---

## 2. Architecture & Strict Scope Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: SSR & HTML5 HYDRATION ENGINE                    │
│                                                                             │
│  @aureliajs/ssr (packages/aurelia-ssr)                                      │
│  OWNS: Rendering Aurelia 2 components to HTML, per-request DI & DOM         │
│        isolation, real ISSRContext markers, HTML5 JSON state handoff.       │
│  DOES NOT OWN: HTTP routing, auth, static files, hydration triggers.        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
┌──────────────────────┐  ┌─────────────────────────┐  ┌────────────────────────┐
│ LAYER 2A: HTTP       │  │ LAYER 2B: WHEN / HOW    │  │ LAYER 2C: WHAT FOREIGN │
│                      │  │                         │  │                        │
│ @hono/aurelia        │  │ @aureliajs/islands      │  │ @aureliajs/bridge      │
│ (packages/           │  │ (packages/              │  │ (packages/             │
│  hono-aurelia)       │  │  aurelia-islands)       │  │  aurelia-bridge)       │
│                      │  │                         │  │                        │
│ OWNS: Hono route &   │  │ OWNS: Zero-JS selective │  │ OWNS: Mounting foreign │
│ action handlers,     │  │ hydration (./server +   │  │ UI trees (<au-bridge>) │
│ Web Streams SSR,     │  │ ~1.3 KB ./loader) AND   │  │ & hypermedia (au-htmx) │
│ WeakMap<Request>     │  │ native Aurelia `island` │  │ via container-scoped   │
│ scoped defaults.     │  │ Template Controller.    │  │ IBridgeRegistry DI.    │
│                      │  │                         │  │                        │
│ DOES NOT OWN: Auth,  │  │ DOES NOT OWN: React/Vue │  │ DOES NOT OWN: Scroll / │
│ cookies, static fs.  │  │ mounting or adapters.   │  │ idle / media triggers. │
└──────────────────────┘  └─────────────────────────┘  └────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 3: COMPILER & DEVELOPER TOOLING                     │
│                                                                             │
│  @aureliajs/vite-plugin-aux  -> Optional .aux SFC compiler (Vite/Bun/esbuild)│
│  ssr-playground              -> Interactive SSR & AST inspector (port 4700) │
│  vscode-aux                  -> VS Code grammar & language support for .aux │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Decision Matrix: "What Should I Install?"

You never have to adopt everything at once. Pick strictly what matches your use case:

| Your Goal | Install | How You Use It |
| :--- | :--- | :--- |
| Render Aurelia 2 to HTML on any Node/Bun server (Express, Fastify, custom HTTP) | `@aureliajs/ssr` | `renderAurelia()`, `serializeState()`, `createHtmlDocument()` + `@aureliajs/ssr/client` |
| Fullstack Aurelia 2 SSR + Server Actions on Hono | `@hono/aurelia` + `@aureliajs/ssr` | `app.get('/', aurelia(HomePage))`, `app.post('/', aureliaAction(HomePage))` |
| Zero-JS static/marketing pages with isolated interactive Aurelia islands | `@aureliajs/islands` + `@aureliajs/ssr` | `<template island="visible">` + `renderIsland()` + `observeIslands()` (~1.3 KB gz) |
| Defer mounting heavy Aurelia components inside an active SPA | `@aureliajs/islands` | `<heavy-widget island="visible\|idle\|interaction\|media">` |
| Embed React, Vue, Svelte, Solid, Preact, Qwik, or HTMX inside Aurelia 2 | `@aureliajs/bridge` | `<au-bridge using="react" loader.bind="loadChart" props.bind="data">` or `au-htmx` |
| Embed foreign frameworks **lazily as islands** (0 KB foreign JS until visible) | `@aureliajs/islands` + `@aureliajs/bridge` | `<au-bridge island="visible" using="react" loader.bind="loadChart" props.bind="data">` |
| Author Aurelia 2 components as Single-File Components (`.aux`) | `@aureliajs/vite-plugin-aux` | `auxPlugin()` in Vite, `auxBunPlugin()` in Bun, `auxEsbuildPlugin()` in esbuild |

### Orthogonal Composition Principle

- **Element = WHAT** (`<pricing-widget>`, `<au-bridge using="react">`, `<section au-htmx>`)
- **`island` attribute = WHEN / HOW** (`island="visible"`, `island="idle"`, `island="interaction"`, `island="media"`)

No double wrapper elements (`<au-island><au-bridge>...</au-bridge></au-island>`). Everything composes natively through Aurelia 2's attribute & Template Controller system.

---

## 4. Package Directory

| Package | Name | Subpath Exports | Documentation |
| :--- | :--- | :--- | :--- |
| `aurelia-ssr` | `@aureliajs/ssr` | `.`, `./server`, `./client` | [Read Guide & Internals](./aurelia-ssr/README.md) |
| `hono-aurelia` | `@hono/aurelia` | `.`, `./client`, `./server`, `./build` | [Read Guide & Internals](./hono-aurelia/README.md) |
| `aurelia-islands` | `@aureliajs/islands` | `.`, `./scheduler`, `./loader`, `./server` | [Read Guide & Internals](./aurelia-islands/README.md) |
| `aurelia-bridge` | `@aureliajs/bridge` | `.`, `./adapters`, `./vite` | [Read Guide & Internals](./aurelia-bridge/README.md) |
| `vite-plugin-aux` | `@aureliajs/vite-plugin-aux` | `.` | [Read Guide & Internals](./vite-plugin-aux/README.md) |
| `ssr-playground` | `ssr-playground` | CLI / HTTP GUI | [Explore Playground](./ssr-playground) |
| `vscode-aux` | `vscode-aux` | VS Code Extension | [Explore Extension](./vscode-aux) |

---

## 5. Contributing & Quality Gates

Every package enforces strict library hygiene:
1. **Zero Application Leakage**: No business schemas (`User`, `Workspace`, billing, auth policies) inside `packages/`.
2. **Strict TypeScript Generics**: No `any` in public APIs, no `@ts-ignore`, clean `tsc -p tsconfig.build.json` declaration emit (no `TS2742`).
3. **Subpath Isolation**: Browser entrypoints (`./client`, `./loader`, `./scheduler`) must never import `jsdom`, `node:*`, or eager runtimes they don't need.
4. **Native Aurelia 2 Primitives**: Prefer `static readonly $au`, container-scoped DI tokens (`IResolver<T>`), `BrowserPlatform(win)`, real `ISSRContext`, and standard Web APIs over global shims or monkey-patching.

Run the verification suite from the monorepo root before opening a PR:

```bash
# Run all unit & integration tests across packages, apps, and examples
bun run test

# Zero-tolerance lint across the repository
bun x oxlint .

# Build & typecheck every workspace package
bun run build && bun run typecheck
```
