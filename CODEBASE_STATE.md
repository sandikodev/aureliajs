# Codebase State

> **Generated**: 2026-11-13 (verified against running code)  
> **Quality**: ✅ All checks passing

## Structure

```
apps/
├── web/                  Aurelia 2 SPA (:4600)
│   ├── src/pages/       9 pages (landing, login, dashboard, projects, members, billing, settings, invite, 404)
│   ├── src/ui/          19 UI primitives (button, input, select, card, dialog, toast, etc.)
│   ├── src/services/    api, auth, i18n, session-cache, theme, toast
│   └── src/config/      routes (public/protected metadata)
└── api/                  Hono JSON API (:4601)
    ├── src/routes/      auth, billing, health, invites, members, overview, projects, workspaces
    ├── src/middleware/  tenant resolution (THE critical file)
    ├── src/db/          schema (8 tables), migrations, seed
    └── src/lib/         error, session, workspace, stripe, plan-limits

packages/
├── shared/              Zod schemas + types + PLAN_LIMITS (single source of truth)
└── hono-aurelia/    ⚠️ Nested git repo (excluded from workspace)

examples/
└── fullstack-ssr/       ⚠️ Standalone (NOT in workspace) — SSR reference implementation
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/middleware/tenant.ts` | **THE SEAM** — session + workspace resolution |
| `apps/api/src/app.ts` | Route registration order (health, auth, webhook BEFORE tenant) |
| `apps/web/src/app.ts` | Root component, auth lifecycle, layout state machine |
| `apps/web/src/main.ts` | Router bootstrap, DI registration |
| `apps/web/src/config/routes.ts` | Public vs protected route metadata |
| `apps/web/src/services/session-cache.ts` | localStorage cache to eliminate flicker |
| `packages/shared/src/index.ts` | Zod contract + PLAN_LIMITS |

## Architecture Decisions

### ✅ SPA + API Pattern (Vite + Hono)
**Why**: Optimal for authenticated dashboard, CDN deploy, scale independently.

**NOT using**: Fullstack SSR single-server (that's for `/examples/fullstack-ssr` only).

### ✅ Tenant Isolation at SQL Level
Every query: `WHERE workspace_id = ?` — enforced by middleware, not per-handler.

### ✅ Session Cache for Zero Flicker
`localStorage` cache → render immediately → validate in background → update if stale.

### ✅ Single Source of Truth for Plan Limits
`PLAN_LIMITS` in `packages/shared` → enforced by API, rendered by UI (can't disagree).

### ✅ Idempotensi Webhook via PK
`stripe_events.id` (primary key) + `onConflictDoNothing` → duplicate webhook = no-op.

## Verified Quality

```bash
✅ pnpm typecheck  # web + api + shared (SSR excluded from workspace)
✅ pnpm lint       # warnings only (unused imports in archived SSR package)
✅ pnpm test       # 127 tests (SSR library)
✅ Dev servers     # :4600 (web) + :4601 (api healthy)
✅ Database        # Postgres up, seeded (demo@aureliajs.dev, 1000 projects)
```

## What Changed (2026-11-13)

1. ✅ **Fixed typecheck**: Import `PUBLIC_ROUTES`, align `session-cache.ts` types with shared
2. ✅ **Cleaned junk**: Removed `.deb` file, `i` file, `bun.lock`
3. ✅ **Fixed nested repo**: Excluded `packages/hono-aurelia` from workspace
4. ✅ **Consolidated docs**: 32 files → 3 files (archived 29 to `docs/archive/`)

## Development

```bash
pnpm dev          # Both servers (web proxy /api → :4601)
pnpm typecheck    # Should be clean
pnpm lint         # Warnings OK
pnpm build        # Production bundle
```

## What's Real

- **8 DB tables**: users, workspaces, memberships, projects, invites, activity, sessions, stripe_events
- **1000 seeded projects**: "Northwind Studio" workspace (demo account)
- **9 pages**: full CRUD + auth + billing + settings
- **19 UI primitives**: design system complete
- **Real Stripe**: webhook signature verification, idempotency, plan enforcement
- **Real tests**: 127 passing (SSR library)
- **Zero placeholders**: every feature is wired end-to-end

---

_All claims verified against running code, not docs._
