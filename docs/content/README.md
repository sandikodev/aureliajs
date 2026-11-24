# Content kit: Sandikodev, Aurelia 2, and production engineering

This folder holds the publish-ready drafts and the earlier community launch kit. Each file stands on its own. Read this index first so every channel quotes the same numbers and the same source of truth.

## Channel map

| File                           | Channel                             | Language   | Job                                                              |
| ------------------------------ | ----------------------------------- | ---------- | ---------------------------------------------------------------- |
| `website-anatomy-of-a-seam.md` | Personal website                    | English    | Canonical long-form piece. Every other channel points here.      |
| `devto-articles.md`            | dev.to                              | English    | Three technical articles. Invites architecture review.           |
| `reddit-post.md`               | r/aurelia, r/webdev                 | English    | Non-promotional discussion post. Link goes in the first comment. |
| `facebook-post.md`             | Facebook                            | Indonesian | Community storytelling in Bahasa Indonesia.                      |
| `linkedin-post.md`             | LinkedIn                            | Indonesian | Five-post sequence. Aurelia 2 first, scaffold and Vercel later.  |
| `community-launch-posts.md`    | dev.to, LinkedIn, Facebook, Discord | Mixed      | Earlier launch kit. Kept as a separate set of drafts.            |

## Proof points and where they come from

Use these exactly. If a number changes in the repo, update it here first, then in every draft.

| Claim                         | Source                                                 | Verified value                                                                                                                            |
| ----------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and integration tests    | `bun test`                                             | 275 pass, 1,651 assertions, 41 files                                                                                                      |
| Browser tests                 | `bun run test:e2e`                                     | 49 pass, 6 spec files                                                                                                                     |
| Production smoke              | `scripts/live-smoke.ts`                                | 36 pass, 6 skipped                                                                                                                        |
| Lighthouse mobile and desktop | `docs/seo-performance.md`                              | 100/100/100/100 on both                                                                                                                   |
| LCP                           | `docs/seo-performance.md`                              | 1.2 s mobile, 0.3 s desktop                                                                                                               |
| Repo split                    | `README.md`, `apps/README.md`                          | `apps/` product, `packages/` framework work. Packages never import from apps.                                                             |
| Tenancy seam                  | `docs/architecture.md`                                 | `tenantOf(c)` derives tenant from session plus membership, not a client header. 401 and 403 are separate. `/health` sits outside tenancy. |
| Idempotency                   | `docs/architecture.md`, `docs/case-study.md`           | `stripe_events.id` is the primary key. Insert, plan change, and audit row share one transaction.                                          |
| Shared contract               | `apps/shared/src/schemas.ts`                           | One Zod schema serves the web form and the API. `issues[].path` maps to form fields.                                                      |
| Static landing                | `scripts/prerender-landing.ts`, `vercel.json`          | Built with `@aureliajs/ssr`, SPA scripts stripped, CSS inlined, `index.html` renamed to `app.html`. `/` serves `landing.html`.            |
| Honest data                   | `apps/api/src/routes/auth.ts`, `scripts/live-smoke.ts` | Signup is the only bootstrap. Seed refuses Neon hosts. Smoke account is deleted through direct SQL afterward.                             |
| SSR adapter                   | `packages/hono-aurelia/src/adapter.ts`                 | `WeakMap<Request, ...>` for request defaults, true Web Streams head flush, no Node filesystem import at runtime.                          |
| Client hydration              | `packages/hono-aurelia/example/src/client.ts`          | Dynamic import per page component, scheduled with `requestIdleCallback`.                                                                  |
| Authored articles             | Cloudflare D1 via `/api/posts`                         | 5 posts, all by Sandikodev.                                                                                                               |
| Live endpoints                | production                                             | `https://aureliajs.vercel.app`, `https://aurelia-hono-ssr.sandiko.workers.dev`                                                            |

## Placeholders to fill before publishing

The drafts use labeled placeholders rather than invented URLs:

- `[personal website URL]`
- `[dev.to article URL]`
- `[GitHub repository URL]`
- `[signup URL]`

## Publishing order

1. Publish the website long-form piece first. It carries the diagrams and the full argument.
2. Publish the three dev.to articles over separate days. Add the website link in each author bio or closing paragraph.
3. Post the Reddit discussion after at least one dev.to article is live. Answer comments before dropping the link.
4. Post LinkedIn and Facebook once the earlier links resolve.

## Voice rules for these drafts

The author is a working engineer, not a brand account. Keep the first person. Prefer concrete files, commands, and numbers over adjectives. No em dashes. No "not just X, it's Y". No "in today's landscape". If you add a fact, add its source or remove it.
