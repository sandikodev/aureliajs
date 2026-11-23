# Codebase State

> **Last Verified**: 2026-11-23 (verified against running code & automated test runners)  
> **Quality Gate**: ✅ 266 Tests Passing (100% Green, 1644 Assertions) • 14 Workspaces Typecheck Clean (0 Errors)

## Structure

```
aureliajs/
├── apps/
│   ├── shared/               # SaaS Domain Zod schemas, DTOs & entitlements (@aurelia-ops/shared)
│   ├── web/                  # Multi-Tenant Client SPA (Aurelia 2 + Tailwind 4) (:4600)
│   └── api/                  # Multi-Tenant REST Backend (Hono + Drizzle + Stripe) (:4601)
├── packages/
│   ├── aurelia-ssr/          # Pure Aurelia 2 SSR & HTML5 JSON Hydration Engine (@aureliajs/ssr)
│   ├── hono-aurelia/         # Thin Web-Standards Hono SSR, Actions & Hydration Adapter (@hono/aurelia)
│   ├── aurelia-islands/      # Zero-JS Selective Hydration & Native `island` Template Controller
│   ├── aurelia-bridge/       # Polyglot Multi-Frontend Interop (<au-react>, <au-vue>, etc. + au-htmx)
│   ├── vite-plugin-aux/      # .aux Single-File Component Compiler (Vite, Bun, esbuild)
│   ├── vscode-aux/           # VS Code Language Extension for .aux SFCs
│   ├── ssr-playground/       # Interactive Web GUI & Headless SSR Inspector (port 4700)
│   └── */example/            # Live reference apps live inside each package workspace
├── docs/                     # Architectural Manifestos & 5-Tier Document System
└── e2e/                      # Playwright E2E Test Suite (Accessibility & Workflows)
```

## Key Files

| File                                    | Purpose                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `docs/ARCHITECTURAL-STUDY.md`           | Master Architectural Blueprint (4-Tier Decoupled Suite)                            |
| `docs/AURELIA_CLEAN_NATIVE_ROADMAP.md`  | 21 Refactoring Execution Phases (100% Green)                                       |
| `apps/api/src/middleware/tenant.ts`     | **THE SEAM** — session + workspace resolution in SaaS backend                      |
| `packages/hono-aurelia/src/client.ts`   | `./client` subpath export for zero-server client hydration                         |
| `packages/aurelia-ssr/src/document.ts`  | Unified 1-step `renderDocument()` API combining render + serialize + HTML shell    |
| `packages/aurelia-bridge/src/index.ts`  | Polyglot bridge components (`<au-react>`, `<au-vue>`, `<au-svelte>`, etc.)         |
| `packages/aurelia-islands/src/index.ts` | Selective hydration scheduler (`island="visible"`, `idle`, `interaction`, `media`) |

## Architecture Decisions

### ✅ 4-Tier Decoupled Framework Suite

1. **WHAT (`@aureliajs/bridge`)**: Dedicated Custom Elements mounting foreign UI runtimes without reconciler collision.
2. **WHEN (`@aureliajs/islands`)**: Template Controller scheduling selective hydration using Synthetic Views.
3. **WHERE (`@aureliajs/ssr`)**: Headless request-scoped server rendering without `globalThis` leaks or mutex bottlenecks.
4. **HOW (`@hono/aurelia`)**: Thin Web-Standards HTTP adapter with streaming and direct `./client` hydration export.

### ✅ SaaS Production App (SPA + API)

- `apps/web` — Aurelia 2 Direct-DOM SPA with Tailwind 4.
- `apps/api` — Hono JSON API with Drizzle ORM, PostgreSQL, and Stripe Billing.
- `apps/shared` — Zod schemas and plan entitlements shared across apps.

## Verified Quality

```bash
bun run typecheck   # ✅ PASSING (all 14 workspaces incl. shared, web, api, package examples)
bun test            # ✅ PASSING (266 tests across 40 files, 1644 assertions, 0 failures)
bunx oxlint .       # ✅ PASSING (0 errors)
```

## Development Commands

```bash
bun dev             # Start web + api dev servers concurrently
bun test            # Run all unit and integration tests across monorepo
bun run typecheck   # Typecheck all 14 workspaces with tsc --noEmit
bun run build       # Build all packages and applications
```
