# @aureliajs/packages — Fullstack Library Suite

This directory contains the production-grade packages and developer tooling designed for the Aurelia 2 and modern server ecosystems, maintained by **Sandikodev ([@sandikodev](https://github.com/sandikodev))**.

---

## 🏛️ Architecture & Separation of Concerns

To adhere strictly to community conventions and eliminate confusion, the packages are structured into distinct tiers based on their scope of responsibility:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   TIER 1: AURELIA 2 SSR & HYDRATION CORE                    │
│                                                                             │
│  📦 @aureliajs/ssr (packages/aurelia-ssr)                                   │
│  - Framework-agnostic server renderer & Direct-DOM hydration core           │
│  - JSDOM virtual platform & NodePlatform shims                              │
│  - SsrTemplateElementFactory (fixes Aurelia 2 template caching AUR0757)     │
│  - RenderMutex FIFO concurrency lock                                        │
│  - Request-scoped DI container cleanup (app.stop() & app.dispose())         │
│  - Anti-XSS state serialization & CSP nonce compliance                      │
│  - Usable in ANY backend runtime (Node, Bun, Vite SSR, Express, Fastify)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 TIER 2: WEB FRAMEWORK ADAPTERS (MIDDLEWARE)                 │
│                                                                             │
│  📦 @hono/aurelia (packages/hono-aurelia) [Git Submodule]           │
│  - Official/community Hono SSR adapter                                      │
│  - Route handler factory: aurelia({ component, loaders, requiresAuth })     │
│  - HTTP Content negotiation (Accept: text/html vs application/json)         │
│  - Automatic injection of Hono context (c.get('user'), c.get('workspace'))  │
│  - High-speed HTML response delivery via c.html()                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  TIER 3: DEVELOPER TOOLS & COMPONENT DX                     │
│                                                                             │
│  🖥️ ssr-playground (packages/ssr-playground)                               │
│  - Interactive browser GUI & compiler inspector (port 4700)                 │
│  - 16 canonical Aurelia 2 examples with real-time SSR & Direct-DOM hydration│
│  - Headless diagnostics suite, AST inspector, & CLS risk auditor            │
│                                                                             │
│  ⚡ @aureliajs/vite-plugin-aux (packages/vite-plugin-aux)                    │
│  - Vite plugin enabling Single-File Components (.aux) for Aurelia 2         │
│                                                                             │
│  🧩 vscode-aux (packages/vscode-aux)                                        │
│  - VS Code language extension for .aux syntax highlighting & IntelliSense   │
│                                                                             │
│  🏝️ @aureliajs/islands (packages/aurelia-islands)                           │
│  - Framework-agnostic Islands Architecture for Aurelia 2 by Sandikodev      │
│  - Zero-boilerplate Universal Island element (<aurelia-island>)             │
│  - Native bridges for React 18/19, Vue 3, Svelte 5, Solid, Preact, & Qwik   │
│                                                                             │
│  🧱 @aureliajs/shared (packages/shared)                                     │
│  - Shared TypeScript interfaces, Zod schemas, and utility functions         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Package Matrix

| Package | Namespace | Purpose / Scope | Dependencies |
| :--- | :--- | :--- | :--- |
| [`aurelia-ssr`](./aurelia-ssr) | `@aureliajs/ssr` | Framework-agnostic SSR and Direct-DOM Hydration Core | `aurelia`, `jsdom` |
| [`hono-aurelia`](./hono-aurelia) | `@hono/aurelia` | Hono middleware & route handler adapter | `hono`, `@aureliajs/ssr` |
| [`ssr-playground`](./ssr-playground) | `ssr-playground` | Interactive Web GUI & Headless Reversing Inspector | `@hono/aurelia`, `hono`, `aurelia` |
| [`vite-plugin-aux`](./vite-plugin-aux) | `@aureliajs/vite-plugin-aux` | Vite SFC (`.aux`) compiler plugin | `vite`, `@rollup/pluginutils` |
| [`vscode-aux`](./vscode-aux) | `vscode-aux` | VS Code extension for `.aux` components | VS Code Extension API |
| [`aurelia-islands`](./aurelia-islands) | `@aureliajs/islands` | Universal Islands Architecture & Multi-Frontend Adapters | `aurelia` |
| [`shared`](./shared) | `@aureliajs/shared` | Common business schemas and utilities | `zod` |

---

## 🧪 Comprehensive Quality Gates

Run all test suites across the entire monorepo:

```bash
# 1. Test Aurelia 2 SSR Core (81 tests)
bun test packages/aurelia-ssr

# 2. Test Hono Aurelia SSR Adapter (134 tests)
bun test packages/hono-aurelia

# 3. Test SSR Playground & Headless Diagnostics (34 tests)
bun test packages/ssr-playground

# 4. Test Aurelia Islands Architecture Suite (3 tests)
bun test packages/aurelia-islands

# 5. Zero-tolerance linter check (oxlint)
bun x oxlint packages/aurelia-ssr packages/hono-aurelia packages/ssr-playground
```

---

## 🤝 Community Naming & Convention Guarantees

1. **Aurelia Community (`@aureliajs/*`)**:
   - Scope is strictly frontend & framework-agnostic rendering.
   - Follows canonical Aurelia 2 Direct-DOM lifecycle conventions (`attached`, `resolve(ID)`, `@customElement`).
   - Does not enforce or inject backend-specific abstractions.

2. **Hono Community (`@hono/*`)**:
   - Scope is strictly HTTP routing, middleware, and web standard request/response handling.
   - Follows canonical Hono patterns identical to `@hono/react-renderer` and `@hono/vue-renderer`.

---

**Maintained with ❤️ by Sandikodev ([@sandikodev](https://github.com/sandikodev))**
