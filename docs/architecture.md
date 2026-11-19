# Architecture

A working SaaS admin dashboard in a Bun workspace monorepo. The point is not the feature list — it is
that every layer is a _seam_ you can replace without rewriting the rest.

```
aureliajs/
├── apps/
│   ├── web/          Aurelia 2 + Vite 8 + Tailwind v4 (UI kit, pages, router)
│   └── api/          Hono + Zod + Drizzle + Postgres + Stripe
├── packages/
│   └── shared/       Zod schemas + types + plan limits used by both sides
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

`stripe_events.id` is the Stripe event id and it is the primary key. The handler inserts the event
first; a duplicate delivery violates the constraint, `onConflictDoNothing` returns no rows, and the
handler answers `200 { duplicate: true }` **without** re-applying the side effect. If processing
throws, the ledger row is deleted so Stripe's retry can try again.

```ts
const inserted = await db
  .insert(schema.stripeEvents)
  .values({ id: event.id, type: event.type })
  .onConflictDoNothing()
  .returning({ id: schema.stripeEvents.id });

if (inserted.length === 0) return c.json({ received: true, duplicate: true });
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

`packages/shared/src/index.ts` is the single source of truth:

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
| Subscription `unpaid` / `incomplete` / `canceled` | `free`                         |

## Billing

Checkout runs on **Stripe's hosted page**, so card data never touches this server and there is no
PCI scope. The API only hands back a URL.

```
POST /api/billing/checkout ──► Stripe Checkout Session ──► browser ──► Stripe
                                                                  │
POST /api/billing/webhook ◄──── signed event ◄─────────────────┘
        │
        ├─ verify `stripe-signature` (raw body, HMAC-SHA256)
        ├─ insert into stripe_events (dedupe)
        └─ apply the plan change + write an audit row
```

`POST /api/billing/portal` opens the Stripe customer portal, where the customer can change the
card, download invoices and cancel.

The webhook handler answers **400** for a signature that does not verify (Stripe will not retry a
malformed request) and **500** for a processing failure (Stripe retries — and the ledger row is
removed so the retry can succeed).

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
