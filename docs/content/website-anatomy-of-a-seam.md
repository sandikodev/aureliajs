# Anatomy of a Seam: A Fullstack Aurelia 2 Product and a Web-Standards SSR Adapter in One Repo

I have been building in the Aurelia ecosystem since the Aurelia 1 days. This repo is the record of what that looks like in 2026 when the goal is not a demo, but a product with real tenants, real billing, and a framework layer that could be published on its own.

It has two pillars, and the boundary between them is the most important decision in the whole codebase.

```
aureliajs/
├── apps/          the product: web, api, shared
└── packages/      the infrastructure: ssr, islands, bridge, vite-plugin-aux, hono-aurelia
```

`apps/` is an end-user SaaS dashboard. It proves that Aurelia 2 can carry multi-tenancy, role-based access, session auth, Postgres, and Stripe billing without a second frontend framework nearby.

`packages/` is the reusable layer. Those packages never import from `apps/`. They solve framework problems: SSR over Web Streams, selective hydration, `.aux` single-file components, and interop with foreign frameworks.

One repo, two different jobs. Keeping them apart is what lets me talk about fullstack engineering and framework engineering without blurring either one.

## The four tiers

Inside the product, the dependency direction is deliberately one-way.

```
shared  →  api  →  web  →  runtime/config
```

**1. Contract (`apps/shared`).** One Zod schema defines what a project input looks like. The API uses it to validate requests. The web form uses the same schema to validate before a request is sent. When validation fails, the error body carries `issues[].path`, and the UI maps that path straight onto the field. There is no translation layer and no second list of rules to keep in sync.

**2. Transport (`apps/api`).** Hono handles routing. Drizzle talks to Postgres. Argon2id hashes passwords. Stripe Checkout keeps card data off this server entirely, so there is no PCI scope to manage.

**3. UI (`apps/web`).** Aurelia 2 with Vite 8 and Tailwind 4. Components are stateful TypeScript classes paired with HTML templates. I removed `clsx`, `class-variance-authority`, and `tailwind-merge` in favor of native Aurelia class bindings. Less bundle weight, fewer glue packages, clearer templates.

**4. Runtime.** Same-origin `/api/*` in production, Vite proxy in development. The API serves the built SPA in a single container when it needs to.

No tier reaches upward. That is the seam.

## Tenancy lives in one file

`apps/api/src/middleware/tenant.ts` resolves the workspace for every tenant-scoped request. It reads the session cookie, verifies the token hash, loads the membership row, and returns one small object:

```ts
const { workspaceId, plan, actorName, role } = tenantOf(c);
```

Tenant identity comes from the session plus the membership query. It never comes from a client-supplied header. A missing or expired session is `401`. A valid user with no workspace membership is `403`. Those are different facts about the request, so they get different answers.

Three rules follow from that:

1. `/health` sits outside tenancy. A health check should not fail because a workspace row is missing.
2. Every tenant-scoped query filters by `workspaceId` in the SQL `WHERE` clause, not in a handler and not in the browser.
3. Routes that cannot carry a session, like the Stripe webhook and invite acceptance, are registered before the tenancy middleware and authenticate with credentials of their own.

If you inherit this codebase, that file is where I would tell you to start.

## The idempotency ledger is a primary key

Stripe delivers events at least once. The same `checkout.session.completed` can arrive twice. Applying the plan change twice makes the audit trail lie about what happened.

`stripe_events.id` is the Stripe event ID and it is the primary key. The insert is the dedupe:

```ts
const outcome = await db.transaction(async (tx) => {
  const inserted = await tx
    .insert(schema.stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: schema.stripeEvents.id });

  if (inserted.length === 0) return { duplicate: true } as const;

  await applyEvent(event, tx);
  return { duplicate: false } as const;
});
```

The ledger row, the plan change, and the audit row share one transaction. If anything throws, Postgres rolls all of it back, including the ledger row, so Stripe's retry starts clean. An earlier version deleted the ledger row in a separate `catch` block. That could leave a half-applied plan change behind with no way to detect it. I removed the workaround instead of documenting it.

## The landing page is static on purpose

The marketing site at `/` is built with `@aureliajs/ssr` at build time, then has its SPA scripts stripped. Critical CSS is inlined, fonts are preloaded, and the shell is written as `landing.html`. The SPA entry is renamed `app.html`. Routing serves the static file at `/` and the SPA shell on deep links.

The result on Lighthouse is 100/100/100/100 on both mobile and desktop, with LCP at 1.2 s mobile and 0.3 s desktop. I write about performance as a build decision, not a CDN flag.

## Empty means empty

This one is cultural more than technical.

Production starts empty. There is no demo account, no fixture data, and no seed script that runs against Neon. The seed command refuses Neon hosts outright. Public signup is the only bootstrap: it creates the user, a workspace, the owner membership, an audit row, and a session in one transaction.

When the API is down, the web app shows an explicit empty or error state. It does not fall back to mock rows. The Worker's article service behaves the same way: an empty D1 table returns an empty list, not `initialPosts`.

I also run a live smoke script against production. It signs up a throwaway account, checks that the projects list is empty, then deletes the account and workspace through a direct SQL connection. The last run finished with 36 passes, 0 failures, and 6 skips. Nothing it creates survives the check.

That habit matters for anyone reviewing the repo. If you see data in there, it came from someone using it.

## The framework side

`@hono/aurelia` is a thin adapter over Web Standards, not a second framework.

- Request-scoped defaults live in a `WeakMap<Request, ...>`, so no state leaks between requests.
- SSR uses real Web Streams and flushes the head early. There is no string-buffer approximation of streaming.
- There is no Node `fs` import at runtime. The filesystem work happens in a build-time `builder.ts`.
- Page metadata follows static-member convention over configuration.
- Client hydration dynamically imports each page component and schedules it with `requestIdleCallback`. The landing page ships no SPA JavaScript at all.
- The example's service layer is D1-only, with no in-memory fixture fallback.

The example is deployed at `https://aurelia-hono-ssr.sandiko.workers.dev`. Its telemetry dashboard recently had a hardcoded `demo-token` path. I removed it. The route now fails closed without a configured `TELEMETRY_TOKEN`, the dashboard entry is gone from the public ARD, and regression tests cover the retired token, the no-token case, and the ARD file itself. A 401 is a better answer than a credential that looks real.

## What the numbers measure

| Check                         | Result                               |
| ----------------------------- | ------------------------------------ |
| Unit and integration tests    | 275 pass, 1,651 assertions, 41 files |
| Playwright E2E                | 49 pass across 6 spec files          |
| Production smoke              | 36 pass, 6 skipped                   |
| Lighthouse mobile and desktop | 100/100/100/100 both                 |
| Submodule tests               | 62 pass                              |

These are not vanity counters. The unit suite covers schema drift, tenancy, billing idempotency, and SSR output. The E2E suite drives real browser navigation, modal creation, theme toggling, team and billing flows, role changes, concurrent slug races, and accessibility checks. The smoke script touches the real database and cleans up after itself.

## Why I published this

Aurelia 2 has a habit of being described in adjectives instead of evidence. Direct DOM, clean architecture, low ceremony. All true, but easy to dismiss without a production-shaped example.

This repo is that example. It is the work of an architect-minded fullstack engineer who also maintains framework-level packages and writes technical articles about both. If you are evaluating Aurelia 2 for a real application, or you maintain something in the ecosystem and want to argue about seams, I would rather have the conversation with code in front of us.

Links and contact details: [personal website URL], [GitHub repository URL], [signup URL].
