# Architecture

A working SaaS admin dashboard in a pnpm monorepo. The point is not the feature list — it is
that every layer is a _seam_ you can replace without rewriting the rest.

```
aureliajs/
├── apps/
│   ├── web/          Aurelia 2 + Vite 8 + Tailwind v4 (UI kit, pages, router)
│   └── api/          Hono + Zod + Drizzle + Postgres
├── packages/
│   └── shared/       Zod schemas + types + formatters used by both sides
├── e2e/              Playwright smoke tests
└── docs/             architecture, case study, Upwork strategy
```

## Runtime shape

```
Browser (Aurelia 2)
   │  fetch /api/*  (Vite proxy in dev, same-origin in prod)
   ▼
Hono app ──► tenant middleware ──► routes ──► Drizzle ──► Postgres 16
   │
   └─ /health (never requires tenancy)
```

Two rules keep this simple:

1. **`/health` is outside tenancy.** A health check must not fail because a workspace row is
   missing.
2. **Every tenant-scoped query filters by `workspaceId` in the `WHERE` clause.** Not in the
   handler, not in the client. Isolation lives in SQL.

## Data model

| Table         | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `users`       | Identity. Argon2id `password_hash` (seeded; M1 login wiring complete). |
| `workspaces`  | Tenant. `plan` (`free`/`pro`), Stripe IDs, trial date.                 |
| `memberships` | (workspace, user) → role `owner` \| `admin` \| `member`.               |
| `sessions`    | Opaque token **hash** + active workspace + expiry.                     |
| `projects`    | The demo domain object: status, budget, due date, owner.               |
| `invites`     | Token-hash invites with role + expiry.                                 |
| `audit_logs`  | Append-only activity feed rendered on the dashboard.                   |

Indexes exist for the two queries that actually run hot:
`projects(workspace_id)`, `projects(workspace_id, status)`, and
`audit_logs(workspace_id, created_at)`.

## The important seam: tenancy

`apps/api/src/middleware/tenant.ts` resolves the workspace for every `/api/*` request.

**M0 (now):** reads `x-workspace-id`, falls back to the first workspace, actor is a constant.
**M1:** reads the session cookie, verifies the token hash, loads the membership row,
rejects with `403` when the user is not in the workspace. Tenancy comes from
the session + membership query (no client headers). `requireRole` guards project
delete to `owner`/`admin`. Login route renders inside the same viewport while the
admin chrome (sidebar/header/footer) is hidden via `isAuthRoute` computed from
`window.location.pathname` on `au:router:navigation-end`.

Routes never know the difference:

```ts
const { workspaceId, plan, actorName } = tenantOf(c);
```

That is deliberate. Swapping tenancy is a one-file change because no handler parses headers or
cookies itself. If you inherit this codebase, start by reading that file.

## Type safety across the boundary

`packages/shared/src/index.ts` is the single source of truth:

- web imports the **types** (`Project`, `CreateProjectInput`);
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

## Plan limits

The free plan is capped at 3 projects, enforced in `POST /api/projects` (returns `402` with
`plan_limit_reached`). This is intentionally a _server_ rule that the UI can surface but not
bypass. Billing (M5) simply changes where `plan` comes from.

## Web layer

**UI kit** (`apps/web/src/ui/`) — shadcn-style primitives, but ported to Aurelia 2. There is no
official shadcn for Aurelia, so the design tokens (oklch neutral palette, radius scale) and the
component anatomy (`cva` variants + `cn()` merging) were ported; the markup is native Aurelia.

- `@customElement({ containerless: true, template: '...' })` for primitives.
- Convention templates (`foo.ts` + `foo.html`) for pages.
- Containerless components cannot take a `class` from the call site — wrap them in a `<div>`
  when the parent needs layout classes. This shows up a few times in `app.html`.

**Pages** — `dashboard`, `projects`, `members`, `billing`, `settings`, `404 fallback`.
The projects page is the main proof: debounced search, status filter, sort, pagination, native
`<dialog>` CRUD, CSV export, and inline validation errors.

**Offline honesty** — `apps/web/src/lib/demo-data.ts` is deterministic sample data used **only**
when the API is unreachable, and the UI renders a "Demo data" banner. A demo that silently fakes
live data is worse than no demo.

**Theming** — `styles/main.css` holds the tokens; `ThemeService` toggles `.dark` and persists to
`localStorage`. A tiny inline script in `index.html` applies the theme before first paint, so
there is no flash.

## Decisions worth knowing

| Decision                                                                           | Why                                                                | Cost                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Pin `aurelia@2.0.0-rc.2`                                                           | It is the current release line; RC means pin exact versions.       | Upgrades are manual.                                                    |
| `@aurelia/state`, not `@aurelia/store`                                             | `@aurelia/store` is still `2.0.0-alpha.3` and does not match rc.2. | Slightly less tooling.                                                  |
| TC39 decorators (`experimentalDecorators: false`, `useDefineForClassFields: true`) | rc.2 ships stage-3 decorator typings.                              | Old blog posts with `experimentalDecorators: true` will not typecheck.  |
| TypeScript 5.9.3, not 7.x                                                          | Decorator + plugin stability.                                      | Not on the newest compiler.                                             |
| Native `<dialog>`                                                                  | No dependency, focus trap + backdrop for free.                     | Esc/backdrop behavior handled manually where needed.                    |
| Vite proxy in dev                                                                  | No CORS surprises, no hardcoded API URL in client code.            | `VITE_API_BASE_URL` needed only when the API is on another origin.      |
| `x-workspace-id` placeholder                                                       | Lets the dashboard be built before auth.                           | Was replaced in M1 — tenancy now comes from session + membership query. |

## Running it

```bash
cp .env.example .env          # dev values only
pnpm install
pnpm db:up                    # Postgres on 127.0.0.1:5544
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev                      # web :4600, api :4601
```

## Roadmap (and where each milestone lands)

| Milestone | Scope                                                                      | Primary files                                                |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| M0 ✅     | Monorepo, UI kit, projects CRUD, overview, seed data                       | current tree                                                 |
| M1        | Argon2id login, session cookie, RBAC, guarded routes, tenancy from session | `middleware/tenant.ts`, `routes/auth.ts`, `services/auth.ts` |
| M2        | Invites, member management persisted                                       | `routes/members.ts`, `members-page.*`                        |
| M3        | Team/role enforcement in UI + API tests                                    | `e2e/`, `apps/api/src/**/*.test.ts`                          |
| M4        | Polish: empty states, keyboard nav, a11y pass                              | `ui/`, `pages/`                                              |
| M5        | Stripe test-mode checkout + webhooks + entitlements                        | `routes/billing.ts`, `billing-page.*`                        |
| M6        | i18n (`@aurelia/i18n`), copy extraction                                    | `locales/`, pages                                            |
| M7        | Deploy, observability, docs, screenshots                                   | CI, `docs/`                                                  |

The ordering matters: M1 changes one seam, and every later milestone builds on a tenant scope
that is already authenticated. Doing billing before auth would mean rewriting it.
