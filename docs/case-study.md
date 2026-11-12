# Case study — Aurelia Ops

_A multi-tenant SaaS admin dashboard built with Aurelia 2, TypeScript, Tailwind CSS 4 and Hono.
Written as a work sample: this is the honest version, including what is not finished._

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

## What was built

**Data layer** — Postgres 16 + Drizzle with seven tables: `users`, `workspaces`, `memberships`,
`sessions`, `projects`, `invites`, `audit_logs`. Migrations are generated and committed; the seed
creates one workspace, four members, a demo owner account, and 1 000 projects.

**API** — Hono with a typed error contract, Zod validation at the boundary, keyset-free
offset pagination, server-side search + filter + sort, and one deliberately isolated tenancy
middleware. Free-plan limit (3 projects) is enforced server-side and returns `402` with a
machine-readable code.

**Web** — Aurelia 2 with a hand-built UI kit: button, badge, card family, input, select,
textarea, label, separator, skeleton, avatar, alert, icon, theme toggle. Five pages plus a
fallback route. The projects page carries the interactive weight: debounced search, filters,
sort, pagination, native `<dialog>` CRUD, CSV export, inline field errors.

**Verification** — TypeScript strict on both apps, Playwright smoke tests over the shell, routing,
filtering, theme toggle and the 404 fallback, with console-error assertions on every test.

## Decisions and trade-offs

**Ported shadcn instead of inventing a design language.** The tokens (oklch palette, radius
scale, semantic naming) and the component anatomy (`cva` variants + `cn()` merging) are proven.
Inventing a visual language would have consumed the time budget without proving anything about
engineering.

**TC39 decorators, not legacy.** Aurelia rc.2 ships stage-3 decorator typings. That means
`experimentalDecorators: false` and `useDefineForClassFields: true`. It is the single most
common trap in current Aurelia tutorials, and it is documented here so the next person does not
lose a day to `TS1238`.

**A placeholder tenancy seam, clearly labelled.** Building the dashboard before auth was a
schedule decision. Rather than scattering user logic through handlers, everything goes through
`tenantOf(c)`. M1 replaces one file. The alternative — hardcoding a user in every route — would
have been faster for a week and much more expensive afterwards.

**One schema, two consumers.** The web form and the API validate with the same Zod schema. This
is not type-safety theatre: it removes an entire class of "the form allows it, the server rejects
it" bugs and keeps error paths aligned with form field names.

**Honest fallback instead of a fake backend.** When the API is down, the UI shows demo data with
a banner. A demo that silently pretends to be live is a liability in a sales conversation.

**Native `<dialog>` instead of a modal library.** Focus handling and the backdrop come for free,
the bundle stays smaller, and the code is short enough to audit.

## Deliberately deferred

Naming these is part of the work sample:

- **Auth (M1)** — Argon2id hashes are seeded, `sessions` and `invites` tables exist; login routes and guarded pages are implemented. Session cookie-based auth with 7-day TTL, HttpOnly/SameSite=Lax cookies, and `GET /api/auth/me` returning `200` with `{user:null,workspace:null,role:null}` when signed out. Tenancy comes from session + membership query (no client headers). `requireRole` guards project delete to `owner`/`admin`. Login route renders inside the same viewport while the admin chrome (sidebar/header/footer) is hidden via `isAuthRoute` computed from `window.location.pathname` on `au:router:navigation-end`.
- **Billing (M5)** — Stripe env keys and the billing page are scaffolded; no checkout or webhook handling yet. Billing after auth, because entitlements depend on identity.
- **Persistence for members/settings** — those pages are in-memory. They exist to show the UI
  contract, not to claim a finished feature.
- **i18n (M6)** — copy is centralized but not extracted to locale files.

## What a reviewer should look at

| If you care about…            | Read                                               |
| ----------------------------- | -------------------------------------------------- |
| Isolation and multi-tenancy   | `apps/api/src/middleware/tenant.ts`                |
| Query shape at 1 000 rows     | `apps/api/src/routes/projects.ts`                  |
| One source of truth for types | `packages/shared/src/index.ts`                     |
| UI system quality             | `apps/web/src/ui/`, `apps/web/src/styles/main.css` |
| Interactive correctness       | `apps/web/src/pages/projects-page.*`               |
| Regression safety             | `e2e/smoke.spec.ts`                                |

## Results

There are no invented metrics here. What can be verified right now:

- Typecheck passes on both apps (strict, `noUncheckedIndexedAccess`).
- Production build succeeds: ~152 kB gzipped JS, ~9 kB gzipped CSS.
- The projects endpoint filters, sorts and paginates 1 000 seeded rows server-side.
- Playwright smoke suite passes against the dev server.

Numbers that would make this a stronger case study — time-to-first-render on a mid-tier laptop,
Lighthouse scores, bundle delta versus a React equivalent — are intentionally left for the
deployment milestone rather than guessed.

---

_If you are reading this as part of a proposal: the fastest way to evaluate me is to ask about
one decision above and see whether the answer holds up. That is the same test I apply to code I
inherit._
