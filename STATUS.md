# Project Status

> **Last Updated**: 2026-11-13  
> **Status**: ✅ Production Ready (M0–M5 Complete)

## ✅ Milestones Complete

| Milestone | Status | Features |
|-----------|--------|----------|
| **M0** | ✅ Done | Project setup, monorepo, dev environment |
| **M1** | ✅ Done | Auth (session cookie, Argon2id) |
| **M2** | ✅ Done | Team management (invite via magic link) |
| **M3** | ✅ Done | Projects CRUD + server-side pagination |
| **M4** | ✅ Done | Stripe billing (Checkout, portal, webhooks) |
| **M5** | ✅ Done | Plan limits enforcement + UI |

## 🎯 Current State

### Architecture Pattern
**SPA + API (Separated)** — following Vite + React + Hono conventions:
- `apps/web` — Aurelia 2 SPA (dev :4600, client-side routing)
- `apps/api` — Hono JSON API (dev :4601, serves static in production)
- `packages/shared` — Zod schemas + types + PLAN_LIMITS

**NOT using fullstack SSR single-server pattern** (that's for `/examples/fullstack-ssr`).

### Quality Gates
```bash
pnpm typecheck  # ✅ PASSING (web + api + shared)
pnpm lint       # ✅ PASSING (warnings only)
pnpm test       # ✅ PASSING (127 SSR tests)
```

### Known Issues
- `packages/hono-aurelia-ssr` excluded from workspace (nested git repo, should be npm package)
- E2E tests not verified recently (require running dev servers)

## 🚀 How to Run

```bash
# Prerequisites
cp .env.example .env      # Use defaults for dev
pnpm install              # Install dependencies
pnpm db:up                # Start Postgres (Docker)
pnpm db:migrate           # Run migrations
pnpm db:seed              # Seed demo data (1 workspace, 4 users, 1000 projects)

# Development
pnpm dev                  # Start web (:4600) + api (:4601)
# Visit http://localhost:4600
# Login: demo@aureliajs.dev / demo-password-123

# Quality checks
pnpm typecheck            # TypeScript
pnpm lint                 # Oxlint
pnpm test                 # Vitest (SSR package)

# Production build
pnpm build                # Build all packages
docker build -t aurelia-ops .
docker-compose -f docker-compose.prod.yml up
```

## 📦 Deployment

**Production**: Single container serves API + static web bundle + SPA fallback.

**Deployment targets**:
- Web: CDN / Cloudflare Pages / Vercel (static)
- API: Cloudflare Workers / Fly.io / Railway (Node server)
- DB: Neon / Supabase / managed Postgres

## 📚 Documentation

- **README.md** — Project overview, features, setup
- **docs/architecture.md** — System architecture, key decisions
- **docs/case-study.md** — Portfolio write-up
- **docs/archive/** — Historical analysis documents (archived)

## 🔗 Quick Links

- Demo account: `demo@aureliajs.dev` / `demo-password-123`
- Seeded workspace: "Northwind Studio" (Pro plan, 1000 projects)
- Health check: http://localhost:4601/health
