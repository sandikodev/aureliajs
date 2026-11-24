# Documentation Archive (Historical Reference)

> [!NOTE]
> **Status: Historical / Preserved for Provenance**
> The documents in this directory (`docs/archive/`) represent early exploratory research, proposals, and design RFCs created on **17 November 2026** during the initial architecture discovery phase.
>
> They are preserved strictly for historical context, decision provenance, and architectural lineage. **They do not reflect the current production implementation.**

---

## Key Divergences from Live Implementation

If you are an engineer, auditor, or AI agent reading these archived documents, be aware of the following evolutions in the live codebase:

| Topic | Archived Document Assumption | Current Production Reality (Canonical) |
|---|---|---|
| **SSR Concurrency** | Early proposals contemplated a serial mutex (`RenderMutex`) to prevent cross-request contamination. | **Eliminated.** Concurrent SSR is natively supported using isolated `BrowserPlatform(win)` instances on LinkeDOM and JSDOM with zero serial bottleneck. |
| **Test Suite** | Early drafts reported 1 failing test in an old Vitest configuration. | **100% Passing.** Standardized on Bun (`bun test`), running 275 tests across 41 files with zero failures. |
| **Examples Directory** | References to a standalone root `examples/fullstack-ssr` or `examples/hono-aurelia`. | **Co-located.** Examples are co-located in their respective subpackages (e.g. `packages/hono-aurelia/example/`, `packages/aurelia-ssr/example/`, `packages/aurelia-islands/example/`, `packages/aurelia-bridge/example/`). |
| **Deployments** | Early drafts noted no public live deployment. | **Live in Production.** Publicly deployed on Cloudflare Workers ([aurelia-hono-ssr.sandiko.workers.dev](https://aurelia-hono-ssr.sandiko.workers.dev)) and Vercel ([aureliajs.vercel.app](https://aureliajs.vercel.app)). |
| **Aurelia Islands & Bridge** | Described as experimental / unproven concepts. | **Fully Implemented.** Zero-Aurelia loader islands (`IslandTemplateController`) and multi-framework bridges (`<au-bridge>` for React, Preact, Vue, Svelte) are fully tested and functional. |

---

## Canonical Live Documentation

For current, authoritative documentation, refer to:

- [Monorepo Documentation Index](../../docs/README.md)
- [Aurelia Clean Native Roadmap](../../docs/AURELIA_CLEAN_NATIVE_ROADMAP.md)
- [Production App Architecture](../../apps/README.md)
- [Package Architecture Index](../../packages/README.md)
  - [@aureliajs/ssr](../../packages/aurelia-ssr/README.md)
  - [@hono/aurelia](../../packages/hono-aurelia/README.md)
  - [@aureliajs/islands](../../packages/aurelia-islands/README.md)
  - [@aureliajs/bridge](../../packages/aurelia-bridge/README.md)
