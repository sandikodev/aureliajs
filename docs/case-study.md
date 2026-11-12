# Case study — Aurelia Ops

_A multi-tenant SaaS admin dashboard built with Aurelia 2, TypeScript, Tailwind CSS 4, Hono and
Stripe. Written as a work sample: this is the honest version, including what is not finished._

---

## The problem

Aurelia 2 is a capable framework with a real gap in the market: almost nobody ships production
dashboards with it, so there are very few public examples of _how_ to do it well. Existing
examples stop at "hello world", todo lists, or a router demo.

That gap is expensive for teams. If you inherit an Aurelia app, you have to answer questions
that the docs do not cover:

- How do you build a component library without an official shadcn-style kit?
- How does per-tenant isolation look when auth is not built yet?
- Where do you validate — client, server, or both — without duplicating rules?
- How do team invitations, seat accounting and role changes fit together?
- How do you take payments without ending up in PCI scope?
- What breaks first when the dependency is still a release candidate?

This project answers those questions in runnable code, not in a blog post.

## Constraints

| Constraint                                   | Consequence                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Aurelia is `2.0.0-rc.2`                      | Exact version pins; decorator config must match stage-3 semantics.        |
| No official shadcn/ui for Aurelia            | Port the tokens and the component anatomy; write the primitives natively. |
| Must be demoable without a backend           | Deterministic sample data + an explicit "Demo data" banner.               |
| Must be readable by a reviewer in 10 minutes | One `pnpm dev`, one README, one architecture doc.                         |
| Realistic data volume                        | Seed 1 000 projects so pagination/filtering are proven, not imagined.     |
| Payments must not create PCI scope           | Stripe-hosted Checkout; card data never reaches the server.               |

## What was built

**Data layer** — Postgres 16 + Drizzle with eight tables: `users`, `workspaces`, `memberships`,
`sessions`, `projects`, `invites`, `audit_logs`, `stripe_events`. Migrations are generated and
committed; the seed creates one workspace, four members, a demo owner account, and 1 000 projects.

**API** — Hono with a typed error contract, Zod validation at the boundary, offset pagination,
server-side search + filter + sort, and one deliberately isolated tenancy middleware. Plan limits
are enforced server-side and return `402` with a machine-readable code.

**Auth** — Argon2id password hashes, an opaque session token that is stored **hashed**, an HttpOnly
`SameSite=Lax` cookie with a 7-day TTL, and `GET /api/auth/me` returning `200` with
`{user:null,workspace:null,role:null}` when signed out so the client can check auth state on boot
without logging a 401. Tenancy comes from the session + membership query — never from a
client-supplied header.

**Team** — an owner invites an email; the account does not need to exist yet. Accepting the
one-time link creates the account if necessary, adds the membership with the invited role, writes
an audit row and **signs the new member in**. Role changes and removals are separate, separately
authorized endpoints; removing a member also revokes the sessions pointing at that workspace.

**Billing** — Stripe-hosted Checkout, the customer portal for card and invoice management, and a
webhook endpoint that verifies the `stripe-signature` header against the **raw** request body
before applying anything. Plan limits live in one shared table so the API that enforces them and
the UI that renders them cannot disagree.

**Web** — Aurelia 2 with a hand-built UI kit: button, badge, card family, input, select,
textarea, label, separator, skeleton, avatar, alert, icon, theme toggle. Seven pages plus a
fallback route. The projects page carries the interactive weight: debounced search, filters,
sort, pagination, native `<dialog>` CRUD, CSV export, inline field errors.

**Verification** — TypeScript strict on all three packages, oxlint clean, and 17 Playwright tests
over the shell, routing, filtering, theme toggle, the 404 fallback, a create → row appears → delete
round trip, the invite → accept → role change → removal path, and the billing webhook (invalid
signature rejected, valid event applied exactly once).

## Decisions and trade-offs

**Ported shadcn instead of inventing a design language.** The tokens (oklch palette, radius
scale, semantic naming) and the component anatomy (`cva` variants + `cn()` merging) are proven.
Inventing a visual language would have consumed the time budget without proving anything about
engineering.

**TC39 decorators, not legacy.** Aurelia rc.2 ships stage-3 decorator typings. That means
`experimentalDecorators: false` and `useDefineForClassFields: true`. It is the single most
common trap in current Aurelia tutorials, and it is documented here so the next person does not
lose a day to `TS1238`.

**One tenancy seam, clearly labelled.** Everything goes through `tenantOf(c)` instead of
scattering user logic through handlers. Auth replaced one file, not thirty. The alternative —
hardcoding a user in every route — would have been faster for a week and much more expensive
afterwards.

**One schema, two consumers.** The web form and the API validate with the same Zod schema. This
is not type-safety theatre: it removes an entire class of "the form allows it, the server rejects
it" bugs and keeps error paths aligned with form field names.

**Plan limits in the shared package, not in the route.** The first version hardcoded "the free
plan is limited to 3 projects" inside the projects handler. That made it impossible for the UI
to show the user what upgrading would give them. `PLAN_LIMITS` now lives next to the schemas:
the API enforces it, the billing page renders it, and they cannot drift.

**Hosted Checkout, not Stripe Elements.** Elements would have been prettier, but it would have
pulled the payment form into our page and put PCI scope on the project. The hosted page means the
API only ever returns a URL, and the card never touches our server. For a portfolio that is the
right trade; for a product that needs a custom checkout UI it would be the wrong one.

**A database table as the idempotency ledger, not an in-memory set.** Stripe delivers events at
least once. Applying the same `checkout.session.completed` twice would make the audit trail
lie about what happened. `stripe_events.id` is the Stripe event id and it is the primary key, so
the insert _is_ the dedupe — a duplicate delivery hits a constraint violation and the handler
answers `200 { duplicate: true }` without re-applying the side effect. A `Set` in memory would
have been simpler and would have lost every guarantee the moment the API restarted.

**Signature failures answer 400, processing failures answer 500.** Stripe does not retry a request
it considers malformed, but it does retry a server error. Getting this backwards means either
losing events or hammering Stripe with payloads we will never accept.

**Honest fallback instead of a fake backend.** When the API is down, the UI shows demo data with
a banner. A demo that silently pretends to be live is a liability in a sales conversation.

**Native `<dialog>` instead of a modal library.** Focus handling and the backdrop come for free,
the bundle stays smaller, and the code is short enough to audit.

## Deliberately deferred

Naming these is part of the work sample:

- **No mail server.** Invitations return an accept link that the UI surfaces (and copies to the
  clipboard) instead of being emailed. In production that link is the body of an email and the
  token never touches a browser.
- **Seat limits are displayed, not enforced on invite.** The plan limit is enforced for projects;
  inviting past the seat limit is still allowed.
- **The workspace switcher is a stub.** The schema and the tenancy middleware support many
  workspaces per user; the UI does not expose them yet.
- **The Scale price is optional.** Without `STRIPE_PRICE_SCALE` the tier reports that it is not
  available rather than failing at the Stripe call.
- **i18n (M6)** — copy is centralized in templates but not extracted to locale files.

## What a reviewer should look at

| If you care about…            | Read                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| Isolation and multi-tenancy   | `apps/api/src/middleware/tenant.ts`                                |
| Query shape at 1 000 rows     | `apps/api/src/routes/projects.ts`                                  |
| One source of truth for types | `packages/shared/src/index.ts`                                     |
| Payments done properly        | `apps/api/src/routes/billing.ts`                                   |
| Webhook idempotency           | `apps/api/src/routes/billing.ts` + `apps/api/src/db/schema.ts`     |
| Invitations end to end        | `apps/api/src/routes/invites.ts`, `apps/api/src/routes/members.ts` |
| UI system quality             | `apps/web/src/ui/`, `apps/web/src/styles/main.css`                 |
| Interactive correctness       | `apps/web/src/pages/projects-page.*`                               |
| Regression safety             | `e2e/smoke.spec.ts`, `e2e/team.spec.ts`, `e2e/billing.spec.ts`     |

## Results

There are no invented metrics here. What can be verified right now:

- Typecheck passes on all three packages (strict, `noUncheckedIndexedAccess`).
- Production build succeeds: ~150 kB gzipped JS, ~9 kB gzipped CSS.
- The projects endpoint filters, sorts and paginates 1 000 seeded rows server-side.
- A new user can be invited, accept a magic link, and be signed in — all against the real API.
- A Stripe webhook with a bad signature is rejected; a valid one is applied exactly once.
- 17 Playwright tests pass against the dev server, every one of them failing on a browser console
  error.

Numbers that would make this a stronger case study — time-to-first-render on a mid-tier laptop,
Lighthouse scores, bundle delta versus a React equivalent — are intentionally left for the
deployment milestone rather than guessed.

---

_If you are reading this as part of a proposal: the fastest way to evaluate me is to ask about
one decision above and see whether the answer holds up. That is the same test I apply to code I
inherit._
