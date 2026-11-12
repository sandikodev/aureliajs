# Aurelia Ops

A working multi-tenant SaaS admin dashboard built with **Aurelia 2 + TypeScript**, **Tailwind CSS 4**,
**Hono**, **Drizzle** and **Postgres**, with **Stripe** billing on top.

It exists because Aurelia 2 has very few public, production-shaped examples. This is one: a dashboard
with a real API, 1 000 seeded rows, server-side filtering/pagination, session auth, working team
invitations, Stripe Checkout + signed webhooks, an audited domain object and a component library — not
another todo list.

![Dashboard, light theme](docs/screenshots/dashboard-light.png)

| Projects                                               | Dark theme                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| ![Projects table](docs/screenshots/projects-light.png) | ![Billing in dark theme](docs/screenshots/billing-dark.png) |

> **Status: M0–M5 implemented.** Auth (session cookie + Argon2id), team management (invite → magic link
> → membership → session), Stripe billing (hosted Checkout, customer portal, signature-verified
> idempotent webhooks) and per-plan entitlements are all wired end to end and covered by e2e tests.

> **Demo account:** `demo@aureliajs.dev` / `demo-password-123`. The seeded workspace is _Northwind Studio_
> on the `pro` plan with 4 members and 1 000 projects.

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

### If the API is down

The UI falls back to deterministic sample data and shows a **Demo data** banner. It never silently
pretends to be live — that distinction matters when the demo is used in a sales conversation.

---

## What works right now

| Area          | Behaviour                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Dashboard     | KPI cards, throughput chart, status breakdown, recent audit activity                                                         |
| Projects      | 1 000 seeded rows, debounced server-side search, status filter, sort, pagination                                             |
| Projects CRUD | Native `<dialog>` create/edit, inline validation from the shared Zod schema, CSV export, audit log on every write            |
| Auth          | Session cookie (HttpOnly, hashed at rest), Argon2id passwords, `/api/auth/me` returns 200 with nulls when signed out         |
| Team          | Owner invites an email → magic link → account created → membership → signed in. Role change, member removal, seat accounting |
| Billing       | Stripe-hosted Checkout, customer portal, signature-verified idempotent webhooks, plan limits enforced from one shared table  |
| Entitlements  | `PLAN_LIMITS` lives in the shared package: the API enforces it and the UI renders it, so they cannot disagree                |
| Settings      | Workspace/profile forms, theme preference                                                                                    |
| Theming       | Light/dark tokens, persisted, no flash on first paint                                                                        |
| Errors        | One typed error contract shared by client and server                                                                         |

**Verification**

```bash
pnpm typecheck      # strict TS, noUncheckedIndexedAccess
pnpm lint           # oxlint
pnpm test           # unit tests (vitest)
pnpm build          # production build of all packages

pnpm exec playwright install chromium   # once
pnpm exec playwright test               # 17 e2e tests against the dev server
```

The Playwright suite covers the shell, routing, the 404 fallback, theme toggle, cross-field validation,
a create → row appears → delete round trip, the full invite → accept → role change → removal path, and
the billing webhook (invalid signature rejected, a valid event applied exactly once).

Production build: **~150 kB gzipped JS**, **~9 kB gzipped CSS**.

---

## Stripe setup (optional)

The dashboard runs without Stripe; billing endpoints then answer `503` with an actionable message
instead of crashing. To try the real checkout:

1. **Copy the keys** from <https://dashboard.stripe.com/test/apikeys> into `.env`:

   ```dotenv
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Create a product and prices** — Dashboard → **More → Product catalog** → _Add product_ →
   _Flat-rate / Recurring_. Create one monthly price and one yearly price, then copy each `price_…` id:

   ```dotenv
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_YEARLY=price_...
   STRIPE_PRICE_SCALE=price_...      # optional, annual Scale tier
   ```

3. **Activate the customer portal** — Dashboard → **Settings → Billing → Portal** → _Activate portal_.
   Without this, the "Manage payment" button fails with a Stripe configuration error.

4. **Forward webhooks locally** — install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then:

   ```bash
   stripe login
   stripe listen --forward-to localhost:4601/api/billing/webhook \
     --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
   ```

   Copy the printed `whsec_…` into `.env` as `STRIPE_WEBHOOK_SECRET`. The secret is stable across
   restarts.

5. **Pay with the test card** `4242 4242 4242 4242`, any future expiry, any CVC, any postal code.

> The webhook endpoint authenticates with the `stripe-signature` header, not a session cookie, so it is
> registered **before** the tenancy middleware — the same reason `/api/invites/accept` is public.

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
| Stripe Checkout (hosted)    | Card data never touches our server — no PCI scope, and the API only returns a URL.       |
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
- Containerless components do not receive event bindings, and **attributes on their host are dropped**.
  `ui-button` keeps its host element and uses `display: contents`, so `click.trigger` works without
  changing layout; `ui-select` and `ui-button` forward `aria-label` to the real focusable element
  because an `aria-label` on the tag would otherwise never reach it.

---

## Architecture

```
apps/web        Aurelia 2, Vite 8, Tailwind 4 — UI kit, pages, router
apps/api        Hono, Zod, Drizzle — REST API, tenancy middleware, Stripe, audit log
packages/shared Zod schemas, types, plan limits — single source of truth
e2e             Playwright smoke + billing + team tests
docs            architecture, case study, Upwork strategy
```

Full write-up: [`docs/architecture.md`](docs/architecture.md).
Portfolio write-up: [`docs/case-study.md`](docs/case-study.md).

The tenancy seam is the most important file to read:
[`apps/api/src/middleware/tenant.ts`](apps/api/src/middleware/tenant.ts). Routes only ever call
`tenantOf(c)`; the session cookie, the workspace and the role are resolved in exactly one place.

---

## Project structure

```
apps/web/src/
  ui/            button, input, select, card, badge, alert, avatar, icon, …
  pages/         dashboard, projects, members, billing, settings, invite, 404
  services/      typed API client, auth service, theme service
  lib/           icons, demo data, formatters
apps/api/src/
  routes/        health, auth, overview, projects, invites, members, billing
  db/            schema, migrations, seed
  middleware/    tenant resolution
  lib/           error contract, session, workspace, stripe, plan limits
```

---

## Deliberately deferred

Being explicit here is part of the work sample:

- **No mail server.** Invitations return an accept link that the UI surfaces (and copies to the
  clipboard) instead of being emailed. The token never needs to exist server-side in plaintext.
- **One workspace per user in practice.** The schema and the tenancy middleware support many; the UI
  workspace switcher is still a stub.
- **Scale tier pricing.** `STRIPE_PRICE_SCALE` is optional; without it the Scale button reports that
  the tier is not available instead of failing at the Stripe call.
- **i18n.** Copy is centralized in templates but not extracted to locale files.
- **No seat enforcement on invite.** The seat limit is displayed and the plan limit is enforced for
  projects, but inviting past the seat limit is not blocked yet.

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
