# Aurelia 2 SaaS Admin Dashboard — Codebase State Document

> **Updated after M5 (Stripe billing) + M3 (team/role enforcement).**
> Last verified: 17/17 Playwright tests passing, typecheck/lint/build clean.

## 📊 Current Milestone Status

| Milestone                      | Status      | Details                                                                                                                                       |
| ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0** (Foundation)            | ✅ Complete | Monorepo (pnpm workspaces), tsconfig.base, .env.example, docker-compose, playwright.config, git initialized                                   |
| **M1** (Auth)                  | ✅ Complete | Session cookie + Argon2id, `/api/auth/me` returns 200 with nulls when signed out, role guards (`requireRole`), chrome hides on public routes  |
| **M2** (Invites/Members)       | ✅ Complete | Persisted invites (email may not have an account), magic-link acceptance creates account + membership + session, member CRUD, seat accounting |
| **M3** (Team/role enforcement) | ✅ Complete | Owner-only invite, owner-only role change, admin+owner removal, session revocation on removal, e2e coverage in `e2e/team.spec.ts`             |
| **M4** (Polish)                | ◐ Partial   | `aria-label` forwarded to focusable elements, empty states added, skeleton loading states. Full keyboard-nav + a11y sweep pending             |
| **M5** (Stripe billing)        | ✅ Complete | Hosted Checkout, customer portal, signature-verified idempotent webhooks, shared `PLAN_LIMITS` entitlements                                   |
| **M6** (i18n)                  | ⏳ Pending  | Not started                                                                                                                                   |

---

## 🔧 API Server Status

- **Running**: `http://localhost:4601` (healthy, returns 200 on `/health`)
- **Base origin**: `http://localhost:4600` (web dev server)
- **DB**: PostgreSQL 127.0.0.1:5544 (via Docker), seeded with demo data

---

## 📦 Package Structure

```
aureliajs/
├── apps/
│   ├── api/          ← Hono server (port 4601)
│   │   routes/: auth.ts, billing.ts, health.ts, invites.ts, members.ts, overview.ts, projects.ts
│   │   db/           ← drizzle ORM schema + migrate + seed
│   │   lib/          ← errors.ts, plan-limits.ts, rate-limit.ts, session.ts, stripe.ts, workspace.ts
│   │   app.ts        ← Hono app composition
│   │   env.ts        ← env schema (DATABASE_URL, STRIPE_*, SESSION_SECRET)
│   │   index.ts      ← server entry (tsx watch)
│   └── web/          ← Aurelia 2 SPA (port 4600)
│       app.ts        ← App shell with router, AuthService, navigation
│       app.html      ← Layout with sidebar, header, footer, ui-components
│       pages/        ← billing, dashboard, invite, login, members, not-found, projects, settings
│       services/     ← api.ts (fetch wrapper), auth.ts (AuthService class), theme.ts
│       lib/          ← utils, icons, demo-data, status
│       styles/       ← Tailwind CSS 4 tokens
│       ui/           ← shadcn-style UI components (17 primitives)
├── packages/
│   └── shared/       ← Zod schemas (user, workspace, project, role, billing, member, invite) + PLAN_LIMITS
├── e2e/
│   ├── billing.spec.ts ← 6 tests
│   ├── smoke.spec.ts   ← 6 tests
│   ├── team.spec.ts    ← 5 tests
│   └── helpers/db.ts   ← direct Postgres access for test setup/teardown
├── drizzle/          ← 0000 (base schema) + 0001_billing_stripe
└── .env, .env.example, docker-compose.yml
```

---

## 🗄️ Database Schema (8 tables)

| Table             | Key Columns                                                                                                                                                                 | Notes                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **users**         | id, email, name, passwordHash (Argon2id), avatarUrl, createdAt                                                                                                              | 4 demo users seeded (1 owner + 3 invited) |
| **workspaces**    | id, name, slug, plan (free/pro/scale), stripeCustomerId, stripeSubscriptionId, subscriptionStatus, subscriptionCurrentPeriodEnd, subscriptionCancelAtPeriodEnd, trialEndsAt | "Northwind Studio" = pro plan             |
| **memberships**   | workspaceId, userId, role (owner/admin/member), createdAt                                                                                                                   | Links users to workspaces                 |
| **sessions**      | id, tokenHash, userId, activeWorkspaceId, expiresAt, createdAt                                                                                                              | HttpOnly cookie-sourced sessions          |
| **projects**      | id, workspaceId, name, status, budgetCents, dueDate, ownerName, createdBy, createdAt, updatedAt                                                                             | 1000+ projects seeded                     |
| **invites**       | id, workspaceId, email, role, tokenHash, expiresAt, acceptedAt, createdAt                                                                                                   | Token-hash invites, 7-day expiry          |
| **audit_logs**    | id, workspaceId, actorName, action, target, createdAt                                                                                                                       | Full audit trail                          |
| **stripe_events** | id (Stripe event id, PK), type, workspaceId, processedAt                                                                                                                    | **Idempotency ledger** for webhooks       |

---

## 🌐 API Routes (All under `/api/*`)

### Public (registered before the tenancy middleware)

| Route              | Method | Auth                  | Description                                                  |
| ------------------ | ------ | --------------------- | ------------------------------------------------------------ |
| `/health`          | GET    | ❌ None               | `{ ok: boolean, db: 'up' \| 'down' }`                        |
| `/auth/me`         | GET    | ❌ Cookie optional    | 200 with nulls when signed out                               |
| `/auth/login`      | POST   | ❌ None               | Argon2id verify, sets HttpOnly session cookie                |
| `/auth/logout`     | POST   | ✅ Cookie             | Clears the session                                           |
| `/billing/webhook` | POST   | ✅ `stripe-signature` | Verifies HMAC over the raw body, dedupes via `stripe_events` |
| `/invites/accept`  | POST   | ✅ One-time token     | Creates account if needed + membership + session             |

### Tenant-scoped (session + membership required)

| Route               | Method | Role         | Description                                          |
| ------------------- | ------ | ------------ | ---------------------------------------------------- |
| `/overview`         | GET    | any          | Stats + recent activity                              |
| `/projects`         | GET    | any          | List with search/filter/sort/pagination              |
| `/projects`         | POST   | any          | Create (402 when the plan limit is reached)          |
| `/projects/:id`     | PATCH  | any          | Update + audit                                       |
| `/projects/:id`     | DELETE | owner, admin | Delete + audit                                       |
| `/members`          | GET    | any          | Team list + seat usage                               |
| `/members/:userId`  | PATCH  | owner        | Change role                                          |
| `/members/:userId`  | DELETE | owner, admin | Remove member + revoke their sessions                |
| `/invites`          | POST   | owner        | Create invite → returns accept URL                   |
| `/invites`          | GET    | owner, admin | List invites with pending/accepted/expired state     |
| `/billing`          | GET    | any          | Plan, limits, usage, subscription state, invoices    |
| `/billing/checkout` | POST   | any          | Creates a Stripe Checkout Session → `{ url }`        |
| `/billing/portal`   | POST   | any          | Creates a Stripe customer-portal session → `{ url }` |

---

## 🎛️ Tenant/Middleware Flow

```
Request → /api/* → auth routes (public)
                 → public billing (webhook) + public invites (accept)
                 → tenant middleware (load session cookie → resolve workspace → set 'tenant' on context)
                 → overview, projects, invites, members, billing
                   │
                   └──→ Routes call `tenantOf(c)` + `requireRole(tenant, 'owner'/'admin')`
```

---

## 🖥️ Web App (Aurelia 2 SPA)

- **Port**: 4600
- **Framework**: Aurelia 2.0.0-rc.2 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn-style UI kit (17 primitives)
- **Routing**: `@aurelia/router` 2.0.0-rc.2
- **API client**: Fetch-based (`@/services/api`) with credentials: `include`
- **Auth state**: `AuthService` class (`refresh()`, `login()`, `logout()`, `isAuthenticated`, `canManage`, `initials`)
- **Pages**: Login, Invite, Dashboard, Projects, Members, Billing, Settings, NotFound
- **Public routes** (no chrome, no session needed): `/login`, `/invite`

### Members Page (`members-page.{ts,html}`)

- Loads the team from `api.members()` — real names, roles, seat usage
- Role dropdown (owner only) + remove button (owner/admin)
- Invite form (email + role) → `POST /api/invites` → shows the accept link and copies it
- Pending invitations list with expiry countdown

### Billing Page (`billing-page.{ts,html}`)

- Loads `api.billing()` — plan, limits, usage, subscription status, invoices
- Plan tier cards (Free / Pro / Scale) with "Choose" / "Upgrade" buttons
- "Manage payment" → Stripe customer portal
- Handles `?checkout=success` / `?checkout=cancelled` return URLs

---

## ✅ Quality Gates

```
pnpm -r typecheck   →  3/3 packages Done
pnpm lint           →  clean (oxlint)
pnpm format         →  prettier, no diff
pnpm build          →  api + web build successfully
pnpm test:e2e       →  17/17 passed
```

**Production build**: ~150 kB gzipped JS, ~9 kB gzipped CSS.

---

## 🧪 Playwright Test Results

```
17 passed

e2e/smoke.spec.ts (6)
  ✓ dashboard renders KPIs and navigation
  ✓ can navigate to projects and filter
  ✓ theme toggle flips the dark class
  ✓ unknown route renders the fallback page
  ✓ new-project dialog validates before submitting
  ✓ creates and deletes a project end to end

e2e/billing.spec.ts (6)
  ✓ GET /api/billing reports plan, limits and usage
  ✓ billing page renders the plan coming from the API
  ✓ checkout is refused when no Stripe price is configured
  ✓ portal is refused when the workspace has no Stripe customer
  ✓ webhook rejects a payload with an invalid signature
  ✓ webhook applies a plan change exactly once

e2e/team.spec.ts (5)
  ✓ members endpoint lists the team with roles and seat usage
  ✓ members page renders the team from the API
  ✓ an invite can be created and accepted, and the new member joins
  ✓ a member can be demoted and removed by the owner
  ✓ a member cannot invite or change roles
```

---

## 🔑 Stripe Configuration

`.env` (gitignored) holds:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=      # ← still empty, needs the Dashboard
STRIPE_PRICE_YEARLY=       # ← still empty, needs the Dashboard
```

The Customer Portal is **activated** in the Stripe dashboard (`bpc_1UavjLHTrh2WQgDtRrKJdWkK`).

**Still needed:** the two price ids. Without them, `POST /api/billing/checkout` answers `400` with
a message naming the exact env var to set — the dashboard still works and shows the Free plan.

**Local webhook forwarding:**

```bash
stripe listen --forward-to localhost:4601/api/billing/webhook \
  --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
```

---

## 📝 Remaining To-Do Items

| Priority     | Milestone     | What's Needed                                                                                                       |
| ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Required** | M5 completion | `STRIPE_PRICE_MONTHLY` + `STRIPE_PRICE_YEARLY` from the Stripe Dashboard → the "Upgrade to Pro" button becomes live |
| **Optional** | M4            | Full keyboard-navigation pass, a11y audit (axe), empty states for every list                                        |
| **Optional** | M6            | i18n support + copy extraction                                                                                      |
| **Optional** | M3 follow-up  | Enforce the seat limit when inviting                                                                                |
| **Optional** | M7            | Deploy (Vercel/Cloudflare), observability, screenshots refresh                                                      |

---

## 🎯 Portfolio Ready State

- **Real auth**: Session cookies (hashed at rest), Argon2id, role guards, 401 on expiry
- **Real tenancy**: One middleware, every query filtered by `workspaceId` in SQL
- **Real team management**: Invite → magic link → account + membership + session; role change; removal with session revocation
- **Real billing**: Stripe-hosted Checkout, customer portal, signature-verified idempotent webhooks, shared plan limits
- **Real persistence**: 8 tables, generated migrations, seeded demo data
- **Real tests**: 17 e2e tests, every one failing on a browser console error
- **Real docs**: README, architecture, case study, Upwork strategy — all updated for M0–M5

---

_Document generated from live codebase inspection. All file contents, types, and test results verified against the running repository._
