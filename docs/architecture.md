# Architecture — Aurelia Ops (Production SaaS Reference App)

> **Scope Dokumen:** Arsitektur Aplikasi Produksi Multi-Tenant SaaS (`apps/web` + `apps/api` + `apps/shared`).  
> **Catatan:** Untuk arsitektur ekosistem framework monorepo dan suite decoupled polyglot (`@aureliajs/bridge`, `@aureliajs/islands`, `@aureliajs/ssr`, `@hono/aurelia`), silakan merujuk ke **[`ARCHITECTURAL-STUDY.md`](ARCHITECTURAL-STUDY.md)**.

A working SaaS admin dashboard in a Bun workspace monorepo. The point is not the feature list — it is
that every layer is a _seam_ you can replace without rewriting the rest.

```
aureliajs/
├── apps/
│   ├── web/          Aurelia 2 + Vite 8 + Tailwind v4 (UI kit, pages, router)
│   ├── api/          Hono + Zod + Drizzle + Postgres + Stripe
│   └── shared/       Zod schemas + types + plan limits (@aurelia-ops/shared)
├── packages/         Core decoupled framework suite (@aureliajs/bridge, islands, ssr, hono-aurelia, etc.)
├── e2e/              Playwright smoke + billing + team tests
└── docs/             architecture, case study, Upwork strategy
```

## Runtime shape

```
Browser (Aurelia 2)
    │  fetch /api/*  (Vite proxy in dev, same-origin in prod)
    ▼
Hono app ──► public routes ──► tenant middleware ──► routes ──► Drizzle ──► Postgres 16
    │                             │
    │                             └─ every query filters by workspaceId in SQL
    │
    ├─ /health                          (never requires tenancy)
    ├─ /api/auth/*                      (session cookie in, session out)
    ├─ /api/billing/webhook             (Stripe signature header, no session)
    └─ /api/invites/accept              (one-time token in the body, no session)
```

Three rules keep this simple:

1. **`/health` is outside tenancy.** A health check must not fail because a workspace row is
   missing.
2. **Every tenant-scoped query filters by `workspaceId` in the `WHERE` clause.** Not in the
   handler, not in the client. Isolation lives in SQL.
3. **Routes that cannot carry a session are registered before the tenancy middleware.** Stripe
   webhooks and invite acceptance authenticate with a credential of their own.

## Data model

| Table           | Purpose                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `users`         | Identity. Argon2id `password_hash`, unique email.                      |
| `workspaces`    | Tenant. `plan` (`free`/`pro`/`scale`), Stripe ids, subscription state. |
| `memberships`   | (workspace, user) → role `owner` \| `admin` \| `member`.               |
| `sessions`      | Opaque token **hash** + active workspace + expiry.                     |
| `projects`      | The demo domain object: status, budget, due date, owner.               |
| `invites`       | Token-hash invites with role + expiry + acceptance timestamp.          |
| `audit_logs`    | Append-only activity feed rendered on the dashboard.                   |
| `stripe_events` | Idempotency ledger: the Stripe event id is the primary key.            |

Indexes exist for the queries that actually run hot:
`projects(workspace_id)`, `projects(workspace_id, status)`,
`audit_logs(workspace_id, created_at)`, `workspaces(stripe_customer_id)`,
`stripe_events(type)`.

### The idempotency ledger

Stripe delivers events **at least once**. The same `checkout.session.completed` can arrive twice,
and applying the plan change twice makes the audit trail lie about what happened.

`stripe_events.id` is the Stripe event id and it is the primary key. The insert _is_ the dedupe:
a duplicate delivery violates the constraint, `onConflictDoNothing` returns no rows, and the
handler answers `200 { duplicate: true }` **without** re-applying the side effect.

The ledger insert and every side effect (plan change, audit row) now run in **one database
transaction**. If anything throws, Postgres rolls the whole thing back — ledger row included — so
Stripe's retry starts from a clean state. An earlier version deleted the ledger row in a separate
`catch` block; that could leave a half-applied plan change behind with no way to detect it, so the
workaround was removed rather than documented.

```ts
const outcome = await db.transaction(async (tx) => {
  const inserted = await tx
    .insert(schema.stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: schema.stripeEvents.id });

  if (inserted.length === 0) return { duplicate: true } as const;

  await applyEvent(event, tx); // plan change + audit row share this transaction
  return { duplicate: false } as const;
});

if (outcome.duplicate) return c.json({ received: true, duplicate: true });
```

## The important seam: tenancy

`apps/api/src/middleware/tenant.ts` resolves the workspace for every tenant-scoped `/api/*` request.

It reads the session cookie, verifies the token hash, loads the membership row, and rejects with
`401` when there is no live session or `403` when the user is not a member of any workspace.
Tenancy comes from the session + membership query — **never** from a client-supplied header.
`requireRole(tenant, 'owner', 'admin')` guards the destructive routes.

Routes never know the difference:

```ts
const { workspaceId, plan, actorName, role } = tenantOf(c);
```

That is deliberate. Swapping tenancy is a one-file change because no handler parses headers or
cookies itself. If you inherit this codebase, start by reading that file.

## Type safety across the boundary

`apps/shared/src/index.ts` is the single source of truth:

- web imports the **types** (`Project`, `CreateProjectInput`, `BillingOverview`);
- the API imports the **schemas** for request validation;
- the web form imports the **same schema** for client-side validation.

So a rule like "budget must be an integer ≥ 0" cannot drift between form and server, and the
error contract is identical on both sides (`{ error: { code, message, issues[] } }`).

## Error contract

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Check the form",
    "issues": [{ "path": "name", "message": "Too short" }]
  }
}
```

`HttpError` + `errorResponse` in `apps/api/src/lib/errors.ts` centralize this. Routes throw;
one handler decides the HTTP status and shape. `issues[].path` maps directly onto form fields,
so the UI does not translate error messages — it renders them.

## Plan limits and entitlements

`PLAN_LIMITS` lives in the shared package:

```ts
export const PLAN_LIMITS: Record<Plan, { projects: number; seats: number }> = {
  free: { projects: 3, seats: 3 },
  pro: { projects: 5000, seats: 10 },
  scale: { projects: 50000, seats: 50 },
};
```

The API enforces it (`POST /api/projects` returns `402 plan_limit_reached`) and the UI renders it
next to the "Upgrade" button. One table, two consumers — they cannot disagree.

**Which plan a workspace gets** is decided in `apps/api/src/lib/plan-limits.ts`:

| Situation                                         | Entitlement                    |
| ------------------------------------------------- | ------------------------------ |
| No Stripe customer yet (seeded / admin-set plan)  | keep the stored plan           |
| Subscription `active` or `trialing`               | `pro`                          |
| Subscription `past_due`                           | keep the plan (Stripe retries) |
| Subscription `unpaid` / `incomplete` / `canceled` / `paused` / `incomplete_expired` | `free` |

## Billing

Checkout runs on **Stripe's hosted page**, so card data never touches this server and there is no
PCI scope. The API only hands back a URL.

```
POST /api/billing/checkout ──► Stripe Checkout Session ──► browser ──► Stripe
                                                                  │
POST /api/billing/webhook ◄──── signed event ◄─────────────────┘
        │
        ├─ verify `stripe-signature` (raw body, HMAC-SHA256, async via constructEventAsync)
        └─ one DB transaction: insert into stripe_events (dedupe)
                               + apply the plan change + write an audit row
```

`POST /api/billing/portal` opens the Stripe customer portal, where the customer can change the
card, download invoices and cancel.

The webhook handler answers **400** for a signature that does not verify (Stripe will not retry a
malformed request) and **500** for a processing failure (Stripe retries — the failed transaction
rolled back, so the retry can succeed). Signature verification uses Stripe's async
`constructEventAsync`; the synchronous variant throws under Bun/Edge.

## Team and invitations

```
Owner ──► POST /api/invites ──► invite row + one-time token
                                    │
                                    ▼  acceptUrl: /invite?token=…
New person ──► GET /invite ──► POST /api/invites/accept
                                    ├─ account created if it did not exist
                                    ├─ membership created with the invited role
                                    ├─ session cookie set  (the magic link signs them in)
                                    └─ audit row written
```

The invited email does **not** need an account — that is the point of an invite. The token is
stored hashed, so a database leak does not hand over live invitations.

Role changes and removals are owner/admin operations (`PATCH`/`DELETE /api/members/:userId`).
Removing a member also deletes the sessions that pointed at that workspace, so access ends
immediately rather than at the next token expiry.

## Web layer

**UI kit** (`apps/web/src/ui/`) — shadcn-style primitives, but ported to Aurelia 2. There is no
official shadcn for Aurelia, so the design tokens (oklch neutral palette, radius scale) and the
component anatomy (`cva` variants + `cn()` merging) were ported; the markup is native Aurelia.

- `@customElement({ containerless: true, template: '...' })` for primitives.
- Convention templates (`foo.ts` + `foo.html`) for pages.
- Containerless components cannot take a `class` from the call site — wrap them in a `<div>`
  when the parent needs layout classes. This shows up a few times in `app.html`.
- Containerless components also **drop attributes on their host**, so `aria-label` has to be
  forwarded explicitly to the focusable element. `ui-select` and `ui-button` both do it.

**Pages** — `dashboard`, `projects`, `members`, `billing`, `settings`, `invite`, `404 fallback`.
The projects page is the main proof: debounced search, status filter, sort, pagination, native
`<dialog>` CRUD, CSV export, and inline validation errors.

**Offline honesty** — `apps/web/src/lib/demo-data.ts` is deterministic sample data used **only**
when the API is unreachable, and the UI renders a "Demo data" banner. A demo that silently fakes
live data is worse than no demo.

**Theming** — `styles/main.css` holds the tokens; `ThemeService` toggles `.dark` and persists to
`localStorage`. A tiny inline script in `index.html` applies the theme before first paint, so
there is no flash.

## Decisions worth knowing

| Decision                                                                           | Why                                                                | Cost                                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Pin `aurelia@2.0.0-rc.2`                                                           | It is the current release line; RC means pin exact versions.       | Upgrades are manual.                                                   |
| `@aurelia/state`, not `@aurelia/store`                                             | `@aurelia/store` is still `2.0.0-alpha.3` and does not match rc.2. | Slightly less tooling.                                                 |
| TC39 decorators (`experimentalDecorators: false`, `useDefineForClassFields: true`) | rc.2 ships stage-3 decorator typings.                              | Old blog posts with `experimentalDecorators: true` will not typecheck. |
| TypeScript 5.9.3, not 7.x                                                          | Decorator + plugin stability.                                      | Not on the newest compiler.                                            |
| Native `<dialog>`                                                                  | No dependency, focus trap + backdrop for free.                     | Esc/backdrop behavior handled manually where needed.                   |
| Vite proxy in dev                                                                  | No CORS surprises, no hardcoded API URL in client code.            | `VITE_API_BASE_URL` needed only when the API is on another origin.     |
| Stripe hosted Checkout, not Elements                                               | Card data never touches our server; no PCI scope.                  | No inline payment form; the user leaves for Stripe.                    |
| `stripe_events` table instead of a Redis set                                       | The ledger is transactional with the plan change it guards.        | One extra table and one insert per event.                              |
| Plan limits in the shared package                                                  | The API enforces and the UI renders; one table, two consumers.     | The shared package carries a little more than schemas.                 |

## Running it

```bash
cp .env.example .env          # dev values only
bun install
bun run db:up                    # Postgres on 127.0.0.1:5544
bun run db:generate && bun run db:migrate && bun run db:seed
bun run dev                      # web :4600, api :4601
```

For Stripe, see the setup section in the README.

## Deploying it (Vercel Functions + Neon)

`apps/` keeps the same architecture in production: one origin serves the Vite SPA and one
Bun Function runs the entire Hono app. Nothing is rewritten to SSR, and the API never
talks to the browser through a second domain.

```
              Vercel project (sandikodev)
 ┌────────────────────────────────────────────────┐
 │  /             → static  apps/web/dist         │
 │  /api/:path*   → api/index.ts → app.fetch      │
 │  /api/health   → same Function (healthRoutes)  │
 └───────────────────────┬────────────────────────┘
                         │ pooled connection
                         ▼
                  Neon Postgres (Marketplace)
```

### Project settings

| Setting | Value |
| --- | --- |
| Root Directory | repository root (`.`) |
| Install Command | `bun install --frozen-lockfile` |
| Build Command | `bun run build` |
| Output Directory | `apps/web/dist` |
| Framework Preset | Other / none |
| Function runtime | Bun (`"bunVersion": "1.x"` in `vercel.json`) |

Bun is deliberate: `hashPassword()` uses `Bun.password` (Argon2id) directly, so the
Function has no native N-API addon to bundle. `vercel.json` rewrites every `/api/:path*`
request to the single `api/index.ts` Function and adds the SPA fallback for every other
path. API routes always win over the rewrite, so `/api/auth/me` reaches Hono while a deep
link such as `/projects` returns `index.html`.

The live deployment is **https://aureliajs.vercel.app** (production alias). Its Stripe
webhook endpoint is `https://aureliajs.vercel.app/api/billing/webhook` with the five
events handled in `routes/billing.ts`; the signing secret is a Vercel Secret named
`STRIPE_WEBHOOK_SECRET`.

### Database

Provision through the Vercel Marketplace so environment variables are injected automatically:

```bash
vercel link --scope sandikodev --project aureliajs
vercel install neon --name aureliajs-db
vercel env ls                      # confirm DATABASE_URL is present
```

Runtime uses the **pooled** Neon string. `db/client.ts` detects `VERCEL=1` and uses a small
pool with `prepare: false`, required because Neon's pooler runs PgBouncer in transaction
mode (named prepared statements cannot be reused across physical connections).

Migrations and seed data are one-off commands that must use the **direct** Neon string:

```bash
DATABASE_URL='<direct-url>' bun run --filter @aureliajs/api db:migrate:prod
# The live demo is seeded with the standard demo account:
DATABASE_URL='<direct-url>' bun run --filter @aureliajs/api db:seed:prod
```

### Environment variables

| Name | Type | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | injected | Neon pooled connection string |
| `WEB_ORIGIN` | Config | Public URL, used for invite links and CORS |
| `NODE_ENV` | Config | `production` |
| `TRUST_PROXY` | Config | `1` — Vercel overwrites `x-forwarded-for` |
| `APP_VERSION` | Config | Reported by `/api/health` |
| `STRIPE_SECRET_KEY` | Secret | Stripe test/live key |
| `STRIPE_WEBHOOK_SECRET` | Secret | Signing secret for the deployed endpoint |
| `STRIPE_PRICE_MONTHLY` | Secret | Monthly Pro price ID (set in the live deployment) |
| `STRIPE_PRICE_YEARLY` / `STRIPE_PRICE_SCALE` | Secret | Optional; the checkout route reports a clear error when a plan's price ID is absent |

`VITE_API_BASE_URL` stays empty: the client calls relative `/api/*` paths on the same origin,
so the session cookie remains first-party.

### Stripe webhook and smoke tests

Register `https://<project>.vercel.app/api/billing/webhook` in Stripe and set its signing
secret as `STRIPE_WEBHOOK_SECRET`. Then deploy and verify:

```bash
vercel --prod
curl https://<project>.vercel.app/api/health                 # {"ok":true,...}
curl https://<project>.vercel.app/api/ready                  # {"db":"up",...}
curl https://<project>.vercel.app/api/auth/me                # 200, null user (no session)
curl -i https://<project>.vercel.app/api/overview            # 401 unauthorized
curl https://<project>.vercel.app/                           # SPA index.html
curl https://<project>.vercel.app/projects                   # SPA deep link → index.html
```

Both API signals matter: a JSON response from `/api/auth/me` (rather than a 404) proves the
rewrite reached the Function, and a `401` from `/api/overview` proves the tenant/auth
middleware ran. A full login + checkout smoke test against the live deployment passed:

```bash
curl -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"demo@aureliajs.dev","password":"demo-password-123"}' \
  https://<project>.vercel.app/api/auth/login
curl -b cookies.txt https://<project>.vercel.app/api/overview                # 200
curl -b cookies.txt -H 'content-type: application/json' \
  -d '{"plan":"pro","interval":"monthly"}' \
  https://<project>.vercel.app/api/billing/checkout                          # 201 + Stripe URL
```

## Roadmap (and where each milestone lands)

| Milestone | Scope                                                                      | Primary files                                                |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| M0 ✅     | Monorepo, UI kit, projects CRUD, overview, seed data                       | current tree                                                 |
| M1 ✅     | Argon2id login, session cookie, RBAC, guarded routes, tenancy from session | `middleware/tenant.ts`, `routes/auth.ts`, `services/auth.ts` |
| M2 ✅     | Invites, member management persisted                                       | `routes/invites.ts`, `routes/members.ts`, `members-page.*`   |
| M3 ✅     | Team/role enforcement in UI + API tests                                    | `e2e/team.spec.ts`, `routes/members.ts`                      |
| M4 ◐      | Polish: empty states, keyboard nav, a11y pass                              | `ui/`, `pages/`                                              |
| M5 ✅     | Stripe test-mode checkout + webhooks + entitlements                        | `routes/billing.ts`, `lib/stripe.ts`, `billing-page.*`       |
| M6        | i18n (`@aurelia/i18n`), copy extraction                                    | `locales/`, pages                                            |
| M7        | Deploy, observability, docs, screenshots                                   | CI, `docs/`                                                  |

The ordering mattered: M1 changes one seam, and every later milestone builds on a tenant scope
that is already authenticated. Doing billing before auth would have meant rewriting it.
