# Aurelia Ops — Monorepo (Apps)

This directory contains the two runtime packages that make up the production application:

| Package     | Purpose            | Tech Stack                                  |
| ----------- | ------------------ | ------------------------------------------- |
| `apps/api/` | Backend API server | Hono, Drizzle ORM, Postgres, Argon2, Stripe |
| `apps/web/` | Frontend SPA       | Aurelia 2, Vite, Tailwind CSS 4             |

Together they form a **fullstack SaaS dashboard** — single-container Docker serves both.

---

## 📦 Packages at a Glance

### `apps/api/`

- **Entry**: `src/index.ts` — Hono app listening on `:4601`
- **Build**: `bun run build` → `dist/server.js`
- **Run**: `bun run dev` (watch) or `bun run start` (built output, via Bun — same as the production Dockerfile)
- **API Docs**: `/api` routes (type-safe via Zod)
- **Database**: Drizzle ORM + Postgres (migrations in `drizzle/`)
- **Auth**: Session cookies (HttpOnly, Argon2id hashed)
- **Billing**: Stripe Checkout + webhooks (signature verified)
- **Key scripts**:
  - `bun run dev` — watch + start
  - `bun run build` — compile to dist
  - `bun run typecheck` — strict TS
  - `bun run test` — Bun native tests (`bun test`)
  - `bun run db:migrate` — Postgres migrations
  - `bun run db:seed` — local-only fixtures (refuses to run against Neon)

### `apps/web/`

- **Entry**: `src/app.html` + `src/main.ts` — Aurelia 2 SPA
- **Build**: `bun run build` → `dist/` (static assets)
- **Run**: `bun run dev` — Vite dev server on `:4600`
- **Pages**: `/` (landing), `/overview`, `/projects`, `/members`, `/billing`, `/settings`, `/login`, `/signup`
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
bun run db:seed                   # LOCAL ONLY: 1 workspace, 4 members, 1k projects
bun run dev                       # web :4600, api :4601
```

Then open <http://localhost:4600>. The API health check is at <http://localhost:4601/health>.

### 2. API Only

```bash
cd /home/dev/project/aureliajs
bun install
bun run db:up                     # or point DATABASE_URL at existing Postgres
bun run db:migrate
bun run db:seed                   # local fixtures only; never against Neon
bun run --filter @aureliajs/api dev   # :4601 only
```

### 3. Web Only (without API)

There is no mock backend. With the API down, pages render explicit empty/error states; signup and
login need a running API.

```bash
cd /home/dev/project/aureliajs
bun install
bun run --filter @aureliajs/web dev   # :4600 only (empty states, no auth)
```

---

## 🗂️ Monorepo Structure (Bun workspace)

```
aureliajs/
├── packages/                # Decoupled Open-Source Framework Contributions
│   ├── aurelia-ssr/         # Aurelia 2 SSR & Hydration Engine (@aureliajs/ssr)
│   ├── hono-aurelia/        # Web-Standards Hono SSR Adapter (@hono/aurelia)
│   ├── aurelia-islands/     # Zero-JS Selective Hydration (@aureliajs/islands)
│   ├── aurelia-bridge/      # Polyglot Interop (<au-bridge> + au-htmx)
│   └── vite-plugin-aux/     # .aux SFC Compiler (@aureliajs/vite-plugin-aux)
├── apps/                    # Production Fullstack Showcase Application
│   ├── api/                 # Enterprise REST API (Hono + Drizzle + Postgres + Bun.password)
│   ├── web/                 # Multi-Tenant Client SPA (Aurelia 2 + Tailwind 4 + .aux)
│   └── shared/              # SaaS Domain Schemas, DTOs & Entitlements (@aurelia-ops/shared)
├── docker-compose.prod.yml  # Production deployment
├── Dockerfile               # Single-container build
├── .env.example             # Dev values (safe defaults)
├── package.json             # Root workspace scripts
└── README.md                # High-level project overview
```

**Key conventions:**

- `apps/shared` — **Contract** between API and Web (Zod types, DTOs, PLAN_LIMITS). Import via `@aurelia-ops/shared`.
- `apps/api/src/env.ts` — Env vars (`STRIPE_*`, `DATABASE_URL`, etc.). Never hardcode.
- `apps/web/src/app.html` — Shell controls `loadingAuth` → `showShell` → layout.
- `bun run --workspaces` — Run scripts across all workspace packages (e.g., `bun run typecheck`).

---

## 🛠️ Common Commands (from repo root)

| Goal                 | Command                                      |
| -------------------- | -------------------------------------------- |
| Install all          | `bun install`                                |
| Typecheck all        | `bun run typecheck`                          |
| Lint all             | `bun run lint`                               |
| Format all           | `bun run format`                             |
| Build all            | `bun run build`                              |
| Run e2e tests        | `bun run test:e2e`                           |
| Run emulation        | `bun run emulate`                            |
| API dev only         | `bun run --filter @aureliajs/api dev`        |
| Web dev only         | `bun run --filter @aureliajs/web dev`        |
| DB up (Docker)       | `bun run db:up`                              |
| DB migrate           | `bun run --filter @aureliajs/api db:migrate` |
| DB seed (local only) | `bun run --filter @aureliajs/api db:seed`    |

> **Note**: `bun run test:e2e` runs Playwright tests. On some systems you may need `LD_LIBRARY_PATH` set for Chromium accessibility libraries. See the project's CI config for details.

---

## 👥 For New Team Members

1. **Fork / clone** the repo
2. `cp .env.example .env` — fill in your values (never commit secrets)
3. `bun install`
4. `bun run db:up` — starts Postgres via Docker
5. `bun run db:migrate && bun run db:seed` (seed is local-only)
6. `bun run dev` — opens both web (:4600) and api (:4601)
7. Create your own account at `/signup` — there is no shared demo login
8. Read `apps/shared/src/schemas.ts` and `apps/shared/src/utils.ts` — the `PLAN_LIMITS` and DTO contract
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

| Path                      | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `apps/shared/`            | Shared Zod schemas, PLAN_LIMITS, API types (@aurelia-ops/shared) |
| `packages/hono-aurelia/`  | SSR adapter (Web-Standards Hono SSR)                             |
| `packages/*/example/`     | Live references colocated with each package workspace            |
| `docker-compose.prod.yml` | Production deployment config                                     |

---

## 🆘 Getting Help

- Check `docs/screenshots/` for UI references
- Run `bun run typecheck` — if it passes, your types are good
- Run `bun run lint` — oxlint warnings are usually safe to ignore initially
- Production has no seeded rows: create an account through `/signup` to get a real, empty workspace
- Browse `git log --oneline -5` for recent context

---

## 📜 License

MIT (c) PT Koneksi Jaringan Indonesia — 2026
