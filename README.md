<div align="center">

# ⚡ Aurelia 2 Enterprise Ecosystem

**Next-Generation Fullstack Monorepo: Hono Edge SSR, `.aux` Single-File Components, Resumable Hydration, Interactive Developer Playground & Production Multi-Tenant SaaS.**

[![Aurelia 2](https://img.shields.io/badge/Aurelia_2-2.0.0--rc.2-ed2939.svg?style=flat-square&logo=aurelia&logoColor=white)](https://aurelia.io)
[![Hono](https://img.shields.io/badge/Hono-v4.7-E36002.svg?style=flat-square&logo=hono&logoColor=white)](https://hono.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9_Strict-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-v4_oklch-06B6D4.svg?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Runtime](https://img.shields.io/badge/Runtime-Bun_%7C_Node_%7C_Edge-fbf0df.svg?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![Linter](https://img.shields.io/badge/Linter-Oxlint_Clean-10b981.svg?style=flat-square)](https://oxc.rs)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

<p align="center">
  <a href="#-monorepo-packages--architecture">Packages</a> •
  <a href="#-interactive-ssr-playground">Playground</a> •
  <a href="#-aurelia-in-html-aux-single-file-components">.aux SFC</a> •
  <a href="#-enterprise-multi-tenant-saas">SaaS Dashboard</a> •
  <a href="#-architectural-manifestos">Research Manifestos</a> •
  <a href="#-quick-start">Quick Start</a>
</p>

</div>

---

## 🌟 Executive Overview

Aurelia 2 combines **Direct-DOM execution (zero Virtual DOM penalty)** with pure **TypeScript class semantics** and **TC39 Stage 3 standard decorators**. However, modern fullstack engineering demands more: edge-native Server-Side Rendering (SSR), intuitive Single-File Component (SFC) developer experience, resumable hydration, and production-tested patterns.

This monorepo serves as the definitive reference and innovation lab:
1. **Edge SSR Engine**: First-class server-side rendering for Hono runtimes (Cloudflare Workers, Deno, Bun, Fastly, Node.js).
2. **`.aux` Single-File Components**: Unifying templates, TypeScript logic, and scoped CSS with zero runtime tax.
3. **Interactive Developer Playground**: SvelteKit-style live compiler, AST visualizer, and live hydration preview.
4. **Production Multi-Tenant SaaS**: Audited, end-to-end multi-tenant dashboard with Argon2id session auth, PostgreSQL, Drizzle ORM, and Stripe Billing.

---

## 📦 Monorepo Packages & Architecture

For a deep open-source breakdown of every package's scope, Aurelia 2 internals, trade-offs, and how to combine them, see **[`packages/README.md`](packages/README.md)**.

```
aureliajs/
├── packages/
│   ├── aurelia-ssr/          # Pure Aurelia 2 SSR & HTML5 JSON Hydration Engine (@aureliajs/ssr)
│   ├── hono-aurelia/         # Thin Web-Standards Hono SSR & Actions Adapter (@hono/aurelia)
│   ├── aurelia-islands/      # Zero-JS Selective Hydration & Native `island` Template Controller
│   ├── aurelia-bridge/       # Polyglot Foreign Framework Interop (<au-bridge> + au-htmx)
│   ├── vite-plugin-aux/      # .aux Single-File Component Compiler (Vite, Bun, esbuild)
│   ├── vscode-aux/           # VS Code Language Extension for .aux SFCs
│   └── ssr-playground/       # Interactive Web GUI & Headless SSR Inspector (port 4700)
├── apps/
│   ├── shared/               # SaaS Domain Zod schemas, DTOs & entitlements (@aurelia-ops/shared)
│   ├── web/                  # Multi-Tenant Client SPA (Aurelia 2 + Tailwind 4)
│   └── api/                  # Multi-Tenant REST Backend (Hono + Drizzle + Stripe)
├── examples/
│   └── fullstack-ssr/        # Live Reference App (Hono + Aurelia 2 SSR + Zero-JS /islands route)
├── docs/                     # Architectural Manifestos & System Specifications
└── e2e/                      # Playwright E2E Test Suite (Accessibility & Workflows)
```

| Package / App | Path | Responsibility | Tech Stack | Guide |
|---|---|---|---|---|
| **`@aureliajs/ssr`** | [`packages/aurelia-ssr`](packages/aurelia-ssr) | Pure SSR renderer (`BrowserPlatform` per container, real `ISSRContext`, `SsrTemplateElementFactory`) & zero-JSDOM `./client` hydrator | Aurelia 2, JSDOM, TypeScript | [README](packages/aurelia-ssr/README.md) |
| **`@hono/aurelia`** | [`packages/hono-aurelia`](packages/hono-aurelia) | Thin Web-Standards Hono adapter (`aurelia`, `aureliaAction`, `aureliaDefaults` via `WeakMap<Request>`, real `ReadableStream` SSR) | Hono 4, Web Streams | [README](packages/hono-aurelia/README.md) |
| **`@aureliajs/islands`** | [`packages/aurelia-islands`](packages/aurelia-islands) | Zero-JS Selective Hydration (`./server` + ~1.33 KB gz `./loader`) & native Aurelia 2 `island` Template Controller | Web APIs, Aurelia 2 | [README](packages/aurelia-islands/README.md) |
| **`@aureliajs/bridge`** | [`packages/aurelia-bridge`](packages/aurelia-bridge) | Polyglot `<au-bridge>` (React, Vue, Svelte, Solid, Preact, Qwik) + `au-htmx` with container-scoped `IBridgeRegistry` DI | Aurelia 2 DI, TypeScript | [README](packages/aurelia-bridge/README.md) |
| **`@aureliajs/vite-plugin-aux`** | [`packages/vite-plugin-aux`](packages/vite-plugin-aux) | `.aux` SFC compiler (`<script setup>`, `defineProps<T>()`, `<script server>`, `<template island="...">`, TC39 Stage 3 decorators) | Vite 8 Oxc, SWC, Bun, esbuild | [README](packages/vite-plugin-aux/README.md) |
| **`@aureliajs/vscode-aux`** | [`packages/vscode-aux`](packages/vscode-aux) | VS Code extension providing `.aux` TextMate highlighting and AST template completions | VS Code API | [Folder](packages/vscode-aux) |
| **`ssr-playground`** | [`packages/ssr-playground`](packages/ssr-playground) | Interactive Web GUI & headless reversing/diagnostics inspector with 16 canonical Aurelia 2 examples | Bun, Hono, Aurelia 2 | [Folder](packages/ssr-playground) |
| **`@aurelia-ops/shared`** | [`apps/shared`](apps/shared) | SaaS domain Zod schemas, DTOs, and plan entitlements isolated from framework packages | Zod, TypeScript | [Folder](apps/shared) |
| **`Aurelia Ops Web`** | [`apps/web`](apps/web) | Multi-tenant admin dashboard with ported shadcn/ui `.aux` primitives | Aurelia 2, Tailwind 4 | [Folder](apps/web) |
| **`Aurelia Ops API`** | [`apps/api`](apps/api) | Multi-tenant REST API with Argon2id sessions, Drizzle ORM, and Stripe billing | Hono, Drizzle, Stripe | [Folder](apps/api) |

---

## 🔬 Interactive SSR Playground

Located at [`packages/ssr-playground`](packages/ssr-playground), this developer tool provides an ergonomic development environment modeled after modern reactive playgrounds:

```bash
# Launch the Web GUI Playground (Default: port 4700)
bun packages/ssr-playground/src/cli/index.ts --serve --port 4700

# Or run terminal TUI diagnostics on all fixtures
bun packages/ssr-playground/src/cli/index.ts
```

### Key Playground Capabilities:
* **Dual-Pane Resizable Interface**: Drag-to-resize split panes with zero flicker and memory-safe event handling.
* **16 Canonical Examples**: Spanning basic interpolation, reactive counters, two-way forms, value converters, binding behaviors, dependency injection, content projection, `.aux` SFCs, and zero-JS resumable hydration.
* **Aurelia 2 Component Design System**: Formal `.au-card`, `.au-tag`, `.au-box`, and button tokens guaranteeing visual and architectural consistency.
* **Multi-Tab Output Inspector**:
  * **Result**: Live hydrated preview inside an isolated security sandbox.
  * **JS Output**: Live TypeScript transpilation and AST inspection with resizable compiler options.
  * **SSR HTML**: Raw server-pre-rendered HTML output formatted with offline Prism syntax highlighting.
  * **Console Drawer**: Synchronized bi-directional runtime logs, event triggers, and diagnostics.
  * **Audit & Metrics**: TTFB, hydration payload size, and AST node counts.

---

## 🧩 Aurelia in HTML (`.aux` Single-File Components)

Developed in [`packages/vite-plugin-aux`](packages/vite-plugin-aux) and [`packages/vscode-aux`](packages/vscode-aux), `.aux` introduces modern SFC ergonomics to Aurelia 2 while maintaining strict compliance with TC39 Stage 3 standards and Direct-DOM performance:

```html
<!-- Example: counter-widget.aux -->
<template>
  <div class="au-card">
    <div class="au-card-header">
      <h3 class="au-card-title">${title}</h3>
      <span class="au-tag au-tag-cyan">.aux SFC</span>
    </div>

    <div class="au-card-body">
      <div class="flex items-center justify-between gap-4">
        <button type="button" class="btn-increment" click.trigger="increment()">
          Count: ${count}
        </button>
        <span class="text-xs font-mono font-semibold text-cyan-400">
          State: ${count > 10 ? 'High' : 'Normal'}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default class CounterWidget {
  title = 'Aurelia in HTML';
  count = 10;

  increment() {
    this.count++;
  }
}
</script>

<style scoped>
.btn-increment {
  padding: 0.375rem 0.875rem;
  background-color: #0284c7;
  color: #ffffff;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.15s ease-in-out;
}
.btn-increment:hover {
  background-color: #0369a1;
}
</style>
```

---

## 🏢 Enterprise Multi-Tenant SaaS

A production-shaped SaaS admin dashboard with real APIs, 1 000 seeded database records, server-side filtering, session authentication, and Stripe payments.

<div align="center">

![Dashboard Light Theme](docs/screenshots/dashboard-light.png)

| Projects Table | Stripe Billing & Customer Portal |
| :---: | :---: |
| ![Projects table](docs/screenshots/projects-light.png) | ![Billing in dark theme](docs/screenshots/billing-dark.png) |

| Members & Magic Link Invites | Native `<dialog>` CRUD |
| :---: | :---: |
| ![Members dark theme](docs/screenshots/members-dark.png) | ![Project dialog](docs/screenshots/project-dialog-light.png) |

</div>

### Production Capabilities:
* **Tenancy Middleware Seam**: Centralized in [`apps/api/src/middleware/tenant.ts`](apps/api/src/middleware/tenant.ts). Handlers cleanly access `tenantOf(c)` with verified workspace and role permissions (`owner`, `admin`, `member`).
* **Session Auth**: HttpOnly cookies with Argon2id passwords, SHA-256 hashed session tokens, and zero-flicker client boot.
* **Stripe Billing Integration**: Hosted Checkout Sessions, Customer Portal self-service, and idempotent signature-verified webhooks (`stripe_events.id`).
* **Ported shadcn/ui Primitives**: Button, Input, Select, Dialog, Card, Badge, Skeleton, Alert, Avatar, and Toaster adapted for Aurelia 2.
* **Deterministic Fallback**: If the API is offline, the web shell automatically falls back to sample mock data with an informative banner.

---

## 📚 Architectural Manifestos & Research

This monorepo documents in-depth philosophical and technical research exploring the evolution of the web substrate:

* 📚 **[Documentation & Architecture Index](docs/README.md)** — Master navigation index and single source of truth across all monorepo architectural tiers.
* 🏛️ **[Master Architectural Blueprint](docs/ARCHITECTURAL-STUDY.md)** — Production 4-Tier Decoupled Suite: `@aureliajs/bridge`, `@aureliajs/islands`, `@aureliajs/ssr`, and `@hono/aurelia`.
* 📄 **[The Resumable Frontier](docs/essays/the-resumable-frontier.md)** — *Manifesto Rekayasa Radikal Aurelia 2, Svelte DX, Hono, dan Qwik*: Blueprint for `.aux` Single-File Components, 3-layer responsibility scoping, and exploring Qwik-style resumability on top of Aurelia's Direct-DOM architecture.
* 📄 **[The Angular-Aurelia Heritage](docs/essays/the-angular-aurelia-heritage.md)** — *Sejarah, Semantik, dan Rekonsiliasi Mental Model Frontend*: Understanding why Aurelia feels foreign to developers from React/Vue unless familiar with Angular, uncovering the historical collaboration between Rob Eisenberg and Google in 2014, dan tracing the path to modern signals.
* 📄 **[The Web Substrate Paradox](docs/essays/the-javascript-fallacy.md)** — *Anatomi Kelahiran Prematur JavaScript, Ilusi TypeScript, dan Kerendahan Hati terhadap Bahasa Sistem Modern*: Critical dissection of why raw JS is not a technological trophy compared to Go, Rust, Nim, and Zig, and why strict typing and memory discipline are vital.
* 📄 **[The Reactive Continuum](docs/essays/the-reactive-continuum.md)** — Architectural matrix comparing React, Vue, Solid, Angular, Svelte, Astro, Qwik, and Aurelia 2 across runtime taxes, change detection, and execution lifecycles.
* 📄 **[Production Architecture & Security](docs/architecture.md)** — Comprehensive technical specifications for multi-tenant isolation, state hydration, and Stripe integration.

---

## 🚀 Quick Start

### Prerequisites
* **Bun**: `≥ 1.2.0` (package manager, runtime, bundler & native test runner)
* **Docker**: (for PostgreSQL container)

### 1. Multi-Tenant SaaS Setup
```bash
# Clone the repository
git clone git@github.com:sandikodev/aureliajs.git
cd aureliajs

# Setup environment variables
cp .env.example .env

# Install dependencies
bun install

# Start Postgres and run migrations
bun run db:up
bun run db:migrate
bun run db:seed       # Seeds Northwind Studio with 4 members and 1 000 projects

# Run Web & API concurrently
bun run dev           # Web on :4600, API on :4601
```

* **Web Application**: [`http://localhost:4600`](http://localhost:4600)
* **API Health Check**: [`http://localhost:4601/health`](http://localhost:4601/health)
* **Demo Credentials**: `demo@aureliajs.dev` / `demo-password-123`

### 2. SSR Playground Setup
```bash
# Launch the interactive SSR Playground web dashboard
bun packages/ssr-playground/src/cli/index.ts --serve --port 4700

# Open in browser
open http://localhost:4700
```

---

## 🧪 Quality Gates & Verification

Every component and adapter in this monorepo is backed by automated tests:

```bash
# 1. Build & typecheck every workspace package and app
bun run build && bun run typecheck

# 2. Run lightning-fast linting with Oxlint (0 warnings / 0 errors)
bun run lint

# 3. Run the entire test suite (aurelia-ssr, hono-aurelia, aurelia-islands, aurelia-bridge, vite-plugin-aux, ssr-playground, examples)
bun run test

# 4. Run live JSDOM + Aurelia 2 DevTools verification emulator
bun run emulate

# 5. Execute Playwright E2E suite
bun run test:e2e
```

---

## 📄 License

Open-source licensed under the [MIT License](package.json).  
Created and maintained by [Sandiko (@sandikodev)](https://github.com/sandikodev).
