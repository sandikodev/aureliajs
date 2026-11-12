# Aurelia Ops

A working multi-tenant SaaS admin dashboard built with **Aurelia 2 + TypeScript**, **Tailwind CSS 4**,
**Hono**, **Drizzle** and **Postgres**.

It exists because Aurelia 2 has very few public, production-shaped examples. This is one: a dashboard
with a real API, 1 000 seeded rows, server-side filtering/pagination, an audited domain object and a
component library — not another todo list.

![Dashboard, light theme](docs/screenshots/dashboard-light.png)

| Projects                                               | Dark theme                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| ![Projects table](docs/screenshots/projects-light.png) | ![Billing in dark theme](docs/screenshots/billing-dark.png) |

> **Status: M0 (foundation) complete.** M1 auth is implemented: session cookie + Argon2id hashes, `/api/auth/me` returns `200` with `{user:null,workspace:null,role:null}` when signed out, protected routes guard to `owner`/`admin`, and the UI chrome hides on the login route. The tenancy seam is fully wired.

> **Demo account:** `demo@aureliajs.dev` / `demo-password-123`. Log in to access the dashboard; the UI chrome (sidebar/header/footer) reveals upon authentication.

**Requirements:** Node.js ≥ 22, pnpm 11, Docker (for Postgres).

```bash
cp .env.example .env          # dev-only values, safe defaults
pnpm install
pnpm db:up                    # Postgres on 127.0.0.1:5544
pnpm db:migrate
pnpm db:seed                  # 1 workspace, 4 members, 1 000 projects
pnpm dev                      # web :4600, api :4601
```

Open <http://localhost:4600>. The API health check is at <http://localhost:4601/health>.

No Docker? Point `DATABASE_URL` at any Postgres 16 instance and run the same migration/seed commands.

**Demo account (seeded, used by M1 auth):** `demo@aureliajs.dev` / `demo-password-123`.
There is no login screen yet, so the UI currently runs as the seeded owner.

### If the API is down

The UI falls back to deterministic sample data and shows a **Demo data** banner. It never silently
pretends to be live — that distinction matters when the demo is used in a sales conversation.

---

## What works right now

| Area          | Behaviour                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Dashboard     | KPI cards, throughput chart, status breakdown, recent audit activity                                                 |
| Projects      | 1 000 seeded rows, debounced server-side search, status filter, sort, pagination                                     |
| Projects CRUD | Native `<dialog>` create/edit, inline validation from the shared Zod schema, CSV export                              |
| Members       | Role-aware table, invite flow UI (not yet persisted — M2)                                                            |
| Billing       | Plan comparison and current usage (no Stripe checkout yet — M5)                                                      |
| Settings      | Workspace/profile forms, theme preference                                                                            |
| Theming       | Light/dark tokens, persisted, no flash on first paint                                                                |
| Auth seam     | Session cookie + Argon2id hashes; `/api/auth/me` returns 200 with nulls when signed out; chrome hides on login route |
| Errors        | One typed error contract shared by client and server                                                                 |

**Verification**

```bash
pnpm typecheck      # strict TS, noUncheckedIndexedAccess
pnpm lint           # oxlint
pnpm test           # unit tests (vitest)
pnpm build          # production build of all packages

pnpm exec playwright install chromium   # once
pnpm exec playwright test               # e2e against the dev server
```

The Playwright suite covers the shell, routing, the 404 fallback, theme toggle, cross-field validation,
and a full create → row appears → delete round trip. Every test fails on a browser console error.

Production build: **~145 kB gzipped JS**, **~9 kB gzipped CSS**.

---

## Stack and why

| Choice                      | Reason                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Aurelia 2 (`2.0.0-rc.2`)    | Explicit templates, TC39 decorators, no virtual DOM. Pinned exactly because it is an RC. |
| Tailwind CSS 4              | CSS-first tokens (oklch), no config file, fast builds.                                   |
| Ported shadcn/ui primitives | No official shadcn for Aurelia, so the tokens + `cva`/`cn()` anatomy were ported.        |
| Hono                        | Small, typed, runs on Node and edge runtimes.                                            |
| Drizzle + Postgres          | SQL-shaped queries with types; migrations are checked in.                                |
| Zod (shared package)        | One schema validates the web form _and_ the API request.                                 |
| Native `<dialog>`           | Focus management and backdrop for free, no dependency.                                   |

### Aurelia 2 specifics that cost time (documented so they don't cost yours)

- `2.0.0-rc.2` uses **stage-3 decorators**: `experimentalDecorators: false`,
  `useDefineForClassFields: true`. Legacy-decorator tutorials do not typecheck.
- The Vite plugin requires **explicit template imports** (`import template from './x.html'`) plus
  `@customElement({ template })`; automatic `.html` sibling detection does not apply under Vite.
- Routed components must be **registered in the DI container**, otherwise the router throws `AUR3174`.
- `<base href="/">` is required for deep links (`/projects` on a hard reload).
- A page property named `loading` collides with the router lifecycle hook and is called as a function.
- `<slot>` needs shadow DOM; use `<au-slot>` for lightweight projection.
- Containerless components do not receive event bindings. `ui-button` keeps its host element and uses
  `display: contents`, so `click.trigger` works without changing layout.

---

## Architecture

```
apps/web        Aurelia 2, Vite 8, Tailwind 4 — UI kit, pages, router
apps/api        Hono, Zod, Drizzle — REST API, tenancy middleware, audit log
packages/shared Zod schemas, types, formatters — single source of truth
e2e             Playwright smoke + CRUD tests
docs            architecture, case study, Upwork strategy
```

Full write-up: [`docs/architecture.md`](docs/architecture.md).
Portfolio write-up: [`docs/case-study.md`](docs/case-study.md).

The tenancy seam is the most important file to read:
[`apps/api/src/middleware/tenant.ts`](apps/api/src/middleware/tenant.ts). Routes only ever call
`tenantOf(c)`; M1 replaces that file with session-cookie verification and nothing else changes.

---

## Project structure

```
apps/web/src/
  ui/            button, input, select, card, badge, alert, avatar, icon, …
  pages/         dashboard, projects, members, billing, settings, 404
  services/      typed API client, theme service
  lib/           icons, demo data, formatters
apps/api/src/
  routes/        health, overview, projects
  db/            schema, migrations, seed
  middleware/    tenant resolution
  lib/           error contract
```

---

## Deliberately deferred

Being explicit here is part of the work sample:

- **M1 — Auth.** Argon2id hashes, `sessions` and `invites` tables exist; login routes and guarded
  pages do not. The tenancy middleware is a labelled placeholder (`x-workspace-id`, first workspace).
- **M2 — Persisted invites/members.** The pages show the UI contract only.
- **M5 — Billing.** Stripe env keys are scaffolded; no checkout or webhooks yet. Entitlements depend
  on identity, so auth comes first.
- **i18n.** Copy is centralized but not extracted to locale files.
- **No unit tests yet.** The e2e suite covers the critical paths; unit tests land with the auth work,
  where they matter most.

---

## Scripts

| Command                                                 | Does                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                                              | All dev servers (web + API + shared watcher)               |
| `pnpm dev:web` / `pnpm dev:api`                         | One side only                                              |
| `pnpm build`                                            | Build every package                                        |
| `pnpm typecheck` / `pnpm lint` / `pnpm test`            | Quality gates                                              |
| `pnpm db:up` / `pnpm db:down`                           | Postgres via Docker                                        |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` | Drizzle workflow                                           |
| `node scripts/screenshots.mjs`                          | Regenerate `docs/screenshots` (dev server must be running) |

---

## License

MIT for the code. The demo data and copy are fictional.
