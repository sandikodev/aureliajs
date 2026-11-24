# Reddit drafts

Use for r/aurelia first, then adapt for r/webdev or r/ExperiencedDevs. Read each subreddit's self-promotion rules before posting. The body below does not contain a link. The link goes in the first comment only if the rules allow it.

---

## r/aurelia

**Title:** After a year of Aurelia 2 in production shape, the biggest win was the build boundary, not the binding engine

**Body:**

I have been using Aurelia since the Aurelia 1 era and recently finished a fullstack reference app that I treat as production shaped rather than a demo. I wanted to share the decision that mattered most, because it was not the part I expected.

The repo has two pillars. `apps/` is the SaaS product: Aurelia 2 web app, Hono API, Drizzle, Postgres, Stripe, shared Zod contracts. `packages/` is framework infrastructure: SSR, islands, a `.aux` compiler, a foreign-framework bridge, and a thin Hono adapter. The packages never import from apps.

Inside the product, tenancy resolves in one middleware file. A missing session is 401, a user with no membership is 403, and every tenant query filters by `workspaceId` in SQL. The API and the web form validate with the same Zod schema, so `issues[].path` maps straight onto a form field.

The surprise was the landing page. I prerender it with the SSR package, strip the SPA scripts, inline the CSS, and serve it as a separate file. Deep links go to the SPA shell. Lighthouse is 100/100/100/100 on mobile and desktop, LCP 1.2 s mobile and 0.3 s desktop. That came from a build decision, not a framework swap.

The other habit I would recommend: production starts empty. No demo account, no seed against the production database, no mock backend when the API is down. Signup creates the user, workspace, owner membership, audit row, and session in one transaction. A live smoke script signs up a throwaway account, checks the empty projects list, then deletes everything.

I am curious what other people here draw as the boundary between "app code" and "framework code." I kept moving it toward the build step over time. Did anyone else land somewhere different?

**First comment (only if allowed):**

I wrote the longer version with code and the billing idempotency details here: [personal website URL]. Repo: [GitHub repository URL]. Happy to answer anything about the adapter or the tenancy seam.

---

## r/webdev (adaptation)

**Title:** What I learned keeping a static landing page and a full SPA in the same Aurelia 2 repo

**Body:**

A pattern I landed on that might be useful outside Aurelia: treat the marketing page and the app shell as two separate build outputs, even when they share a framework.

The landing page is prerendered at build time. Critical CSS is inlined, fonts are preloaded, and the SPA scripts are stripped out. It ships as `landing.html`. The app shell ships as `app.html`. Routing serves the static file at `/` and the SPA on deep links.

Result: 100/100/100/100 on Lighthouse mobile and desktop, LCP 1.2 s and 0.3 s respectively. A visitor reading the homepage never downloads the app runtime.

The part I would stress is that this is a build-script job, not a hosting trick. If your framework can render to HTML at build time, you can do it. The script that does it is `scripts/prerender-landing.ts`.

Also worth saying: I deliberately removed the demo data and mock backend. When the API is down, the app shows an empty state. It does not silently fall back to fixtures. That made the smoke tests much more honest, because an empty list actually means empty.

Anyone else shipping two build outputs from one repo? I am interested in how you handle shared styles without reintroducing render-blocking CSS.

**First comment (only if allowed):**

Write-up: [personal website URL]. Source: [GitHub repository URL].
