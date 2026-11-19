# Aurelia Ops — Monorepo (Apps)

This directory contains the two runtime packages that make up the production application:

| Package | Purpose | Tech Stack |
|---------|---------|------------|
| `apps/api/` | Backend API server | Hono, Drizzle ORM, Postgres, Argon2, Stripe |
| `apps/web/` | Frontend SPA | Aurelia 2, Vite, Tailwind CSS 4 |

Together they form a **fullstack SaaS dashboard** — single-container Docker serves both.

---

## 📦 Packages at a Glance

### `apps/api/`
- **Entry**: `src/index.ts` — Hono app listening on `:4601`
- **Build**: `bun run build` → `dist/server.js`
- **Run**: `bun run dev` or `bun run start`
- **API Docs**: `/api` routes (type-safe via Zod)
- **Database**: Drizzle ORM + Postgres (migrations in `drizzle/`)
- **Auth**: Session cookies (HttpOnly, Argon2id hashed)
- **Billing**: Stripe Checkout + webhooks (signature verified)
- **Key scripts**:
  - `bun run dev` — watch + start
  - `bun run build` — compile to dist
  - `bun run typecheck` — strict TS
  - `bun run test` — Bun native tests (`bun test`)
  - `bun run db:migrate` / `bun run db:seed` — Postgres setup

### `apps/web/`
- **Entry**: `src/app.html` + `src/main.ts` — Aurelia 2 SPA
- **Build**: `bun run build` → `dist/` (static assets)
- **Run**: `bun run dev` — Vite dev server on `:4600`
- **Pages**: `/overview`, `/projects`, `/members`, `/billing`, `/settings`
- **UI**: Components in `apps/web/src/ui/` (button, card, input, select, etc.)
- **i18n**: English + Indonesian (250+ keys, persisted in localStorage)
- **Key scripts**:
  - `bun run dev` — Vite dev server
  - `bun run build` — Rollup build
  - `bun run typecheck` — TS strict check
  - `bun run format` — Prettier
  - `bun run lint` — oxlint

---

## 🔄 Development Workflow

### 1. Full Stack (both packages)
```bash
cd /home/dev/project/aureliajs
cp .env.example .env          # copy, edit as needed
bun install                  # installs root deps + workspace
bun run db:up                     # start Postgres (Docker)
bun run db:migrate                # run migrations
bun run db:seed                   # seed 1 workspace, 4 members, 1k projects
bun run dev                       # web :4600, api :4601
```

Then open <http://localhost:4600>. The API health check is at <http://localhost:4601/health>.

### 2. API Only
```bash
cd /home/dev/project/aureliajs
bun install
bun run db:up                     # or point DATABASE_URL at existing Postgres
bun run db:migrate
bun run db:seed
bun run --filter @aureliajs/api dev   # :4601 only
```

### 3. Web Only (without API)
The UI falls back to deterministic sample data and shows a **Demo data** banner. It never silently pretends to be live.

```bash
cd /home/dev/project/aureliajs
bun install
bun run --filter @aureliajs/web dev   # :4600 only (mock mode)
```

---

## 🗂️ Monorepo Structure (Bun workspace)

```
aureliajs/
├── packages/                # Shared deps & types
│   ├── shared/              # Zod schemas, PLAN_LIMITS, API types
│   └── hono-aurelia/    # SSR adapter (future unification)
├── apps/                    # ← This directory
│   ├── api/                 # Backend (Hono + Drizzle)
│   └── web/                 # Frontend (Aurelia 2 + Vite)
├── examples/                # R&D / reference projects
│   └── fullstack-ssr/       # Hono + Aurelia SSR demo
├── docker-compose.prod.yml  # Production deployment
├── Dockerfile               # Single-container build
├── .env.example             # Dev values (safe defaults)
├── package.json             # Root workspace scripts
└── README.md                # High-level project overview
```

**Key conventions:**
- `packages/shared` — **Contract** between API and Web (types, schemas). Import via `@aureliajs/shared`.
- `apps/api/src/env.ts` — Env vars (`STRIPE_*`, `DATABASE_URL`, etc.). Never hardcode.
- `apps/web/src/app.html` — Shell controls `loadingAuth` → `showShell` → layout.
- `bun run --workspaces` — Run scripts across all workspace packages (e.g., `bun run typecheck`).

---

## 🛠️ Common Commands (from repo root)

| Goal | Command |
|------|---------|
| Install all | `bun install` |
| Typecheck all | `bun run typecheck` |
| Lint all | `bun run lint` |
| Format all | `bun run format` |
| Build all | `bun run build` |
| Run e2e tests | `bun run test:e2e` |
| API dev only | `bun run --filter @aureliajs/api dev` |
| Web dev only | `bun run --filter @aureliajs/web dev` |
| DB up (Docker) | `bun run db:up` |
| DB migrate | `bun run --filter @aureliajs/api db:migrate` |
| DB seed | `bun run --filter @aureliajs/api db:seed` |

> **Note**: `bun run test:e2e` runs Playwright tests. On some systems you may need `LD_LIBRARY_PATH` set for Chromium accessibility libraries. See the project's CI config for details.

---

## 👥 For New Team Members

1. **Fork / clone** the repo
2. `cp .env.example .env` — fill in your values (never commit secrets)
3. `bun install`
4. `bun run db:up` — starts Postgres via Docker
5. `bun run db:migrate && bun run db:seed`
6. `bun run dev` — opens both web (:4600) and api (:4601)
7. Log in with: `demo@aureliajs.dev` / `demo-password-123`
8. Read `packages/shared/src/index.ts` (lines 72–77) — the `PLAN_LIMITS` contract
9. Run `bun run typecheck` to verify your changes don't break types
10. If adding a new route: edit `apps/api/src/routes/`, then `apps/web/src/pages/`, then update `config/routes.ts`

**Never hardcode** IP, email, token, port, or username. Use `.env` file for local development.

---

## 📦 Deployment

**Production**: Single Docker container serves API + Web bundle.

```bash
# Build + run (from repo root)
bun run build              # compiles both apps
docker compose -f docker-compose.prod.yml up -d
```

See `Dockerfile` and `docker-compose.prod.yml` for the multi-stage build.

---

## 🔗 Related Repos / Packages

| Path | Purpose |
|------|---------|
| `packages/shared/` | Shared Zod schemas, PLAN_LIMITS, API types |
| `packages/hono-aurelia/` | SSR adapter (WIP — enables future unification) |
| `examples/fullstack-ssr/` | Reference: Hono + Aurelia SSR (standalone) |
| `docker-compose.prod.yml` | Production deployment config |

---

## 🆘 Getting Help

- Check `docs/screenshots/` for UI references
- Run `bun run typecheck` — if it passes, your types are good
- Run `bun run lint` — oxlint warnings are usually safe to ignore initially
- The `demo@aureliajs.dev` / `demo-password-123` account has a **Pro** workspace with seeded data
- Browse `git log --oneline -5` for recent context

---

## 📜 License

MIT (c) PT Koneksi Jaringan Indonesia — 2026