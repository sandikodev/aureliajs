# dev.to drafts

Three separate articles. Publish on separate days. Each one links back to the canonical website piece in the closing paragraph or author bio. Replace `[personal website URL]` and `[GitHub repository URL]` before publishing.

---

## Article 1

**Title:** The Seam Is the Feature: Multi-Tenant Authorization in a Hono + Aurelia 2 App

**Tags:** `#aurelia` `#hono` `#typescript` `#webdev` `#architecture`

### Draft

Most multi-tenant tutorials stop at "add a `workspace_id` column." The harder part is making sure no handler ever has to remember that fact.

In my production SaaS app, tenancy resolves in exactly one file. `apps/api/src/middleware/tenant.ts` reads the session cookie, verifies the token hash, loads the membership row, and hands the route a small object:

```ts
const { workspaceId, plan, actorName, role } = tenantOf(c);
```

No route parses a header. No route reads the cookie. Tenant identity comes from the session plus the membership query, never from something the client sent along.

### 401 and 403 are different answers

A missing or expired session returns `401`. A valid user with no membership returns `403`. Collapsing those into one "not authorized" response throws away information about what actually happened, and it makes debugging customer reports needlessly slow.

`requireRole(tenant, 'owner', 'admin')` guards the destructive routes on top of that. The role comes from the same membership row.

### Isolation belongs in SQL

Every tenant-scoped query filters by `workspaceId` in the `WHERE` clause. Not in the handler, not in the client. If isolation lives in application code, one forgotten `if` is a data leak. If it lives in the query, the database enforces it.

Indexes follow the queries that actually run: `projects(workspace_id)`, `projects(workspace_id, status)`, `audit_logs(workspace_id, created_at)`.

### Two routes that cannot carry a session

The Stripe webhook authenticates with a signature header. Invite acceptance authenticates with a one-time token in the body. Both are registered before the tenancy middleware. Trying to force every route through the same session seam is how webhook handlers end up with weird special cases scattered across the file.

`/health` is outside tenancy too. A health check must not fail because a workspace row is missing.

### The contract is shared, so the error is shared

`apps/shared` holds one Zod schema for each input. The API validates with it. The web form validates with the same schema before sending anything. When validation fails, the response looks like this:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Check the form",
    "issues": [{ "path": "name", "message": "Too short" }]
  }
}
```

`issues[].path` maps directly onto a form field. The UI renders the message. It does not translate it. One rule, two consumers, no drift.

### The other half of the story

Plan limits live in the shared package as one table. The API enforces the limit with `402 plan_limit_reached`. The UI renders the same number next to the upgrade button. Entitlement state from Stripe maps into that table in one place, including the uncomfortable states like `past_due`, where the existing plan is kept while Stripe retries.

I wrote the longer version, including the billing idempotency ledger and the full transaction shape, on my website: [personal website URL]. The repo is at [GitHub repository URL]. If you have a different way to draw the tenancy seam, I want to read it.

---

## Article 2

**Title:** Writing an SSR Adapter Against Web Standards, Not a Framework

**Tags:** `#aurelia` `#hono` `#ssr` `#cloudflare` `#webdev`

### Draft

`@hono/aurelia` started from a constraint: the adapter should know about `Request` and `Response`, not about a specific hosting runtime.

That constraint produced a few decisions I keep coming back to.

### Request state in a WeakMap

Middleware defaults are scoped per request with `WeakMap<Request, ...>`. No module-level mutable config, no "current request" global. When the request is garbage collected, its defaults go with it. Concurrent requests cannot overwrite each other's settings because there is nothing shared to overwrite.

### Streaming means streaming

The SSR path uses real Web Streams and flushes the head early. There is no buffer that gets assembled into a string and then wrapped in a `Response` to look like a stream. On Cloudflare Workers and in Bun, this is the difference between a page that starts arriving and a page that arrives all at once.

### No Node filesystem at runtime

The filesystem work lives in a build-time `builder.ts`. The runtime imports no `node:fs`. That is what lets the same package run in a Worker, in Bun, in Node, and in a container without a pile of conditional shims.

### Convention over configuration for metadata

Page metadata is declared as static members on the page class. No separate config file per route, no registry to keep in sync with the router. The framework reads what is already on the class. This is the part that matters most when an LLM is generating code: fewer places to guess means fewer wrong guesses.

### Hydration is scheduled, not eager

The client entry dynamically imports each page component and schedules the work with `requestIdleCallback`. A page with no interactive islands does not pay for a bundle it will never use.

The example app takes this further. Its landing page is prerendered with the SPA scripts stripped and critical CSS inlined. The SPA shell has a different filename, so `/` serves static HTML and deep links serve the app. Lighthouse is 100/100/100/100 on both mobile and desktop, with LCP at 1.2 s mobile and 0.3 s desktop.

### Fail closed, especially in the demo

The example had a telemetry dashboard guarded by a `demo-token` in the public Agentic Resource Discovery document. That is a credential-shaped string in a public file, which teaches the wrong habit even when it is harmless. I removed it. The route now requires a configured `TELEMETRY_TOKEN`, the dashboard entry is gone from the ARD, and regression tests cover the retired token, the no-token case, and the ARD contents.

`/api/dashboard/stats` returns 401 without a token and 200 with the real one. A boring, correct 401 is the right default.

The full write-up with the build-time pipeline and the upstream proposal context is here: [personal website URL]. Source: [GitHub repository URL].

---

## Article 3

**Title:** Zero-JS Landing Pages in an Aurelia 2 Monorepo

**Tags:** `#aurelia` `#performance` `#vite` `#webdev` `#opensource`

### Draft

The landing page for my Aurelia 2 project is static HTML. The app behind it is an Aurelia 2 SPA with routing, i18n, and a Hono API. Those two facts are compatible, and the build script is where the boundary lives.

### How it is built

`@aureliajs/ssr` renders the landing shell at build time. Then `scripts/prerender-landing.ts`:

1. strips the SPA script tags from the rendered shell,
2. finds the generated stylesheet, reads it, and inlines it as critical CSS,
3. preloads the font,
4. writes the result as `landing.html`.

The SPA entry is renamed `app.html`. The routing config serves `landing.html` at `/` and falls back to `app.html` on deep links. A visitor landing on the marketing page never downloads the SPA runtime. A visitor who signs up gets the full app.

### No mock backend

There is no fake API mode in this repo. With the API down, pages show explicit empty or error states. The seed command refuses to run against the Neon host, and production has no demo account. Public signup is the only way in: it creates the user, workspace, owner membership, audit row, and session in one transaction.

This changes what "empty state" means. It is not a placeholder waiting for fixture data. It is the honest state of a new account.

### What the measurements say

Lighthouse reports 100/100/100/100 on mobile and desktop. LCP is 1.2 s on mobile and 0.3 s on desktop. The unit suite includes checks on the generated SEO output and session cookie behavior, so a build change that breaks the static shell fails a test rather than a screenshot review.

The wider numbers: 275 unit and integration tests with 1,651 assertions across 41 files, 49 Playwright E2E tests across 6 spec files, and a live smoke run that signed up a throwaway account, verified the empty projects list, then deleted everything through direct SQL. 36 passes, 0 failures, 6 skips.

### Why I bother

Performance advice often arrives as a list of CDN settings. In this case the win came from deciding that a marketing page does not need a router. That is an architecture decision, then a build script, then a number.

The full anatomy of the repo, including the tenancy seam and the billing ledger, is on my website: [personal website URL]. Code: [GitHub repository URL].
