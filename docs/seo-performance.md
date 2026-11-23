# SEO, performance and delivery

This document records the production delivery work done on 23 November 2026.
It is written for operators who need to know **what** changed and **how to
verify it**, not just for framework authors.

## Short version: SEO vs SEM

|         | Meaning                          | What we can change in this repo                                  |
| ------- | -------------------------------- | ---------------------------------------------------------------- |
| **SEO** | Organic (free) search visibility | Crawlability, metadata, page speed, mobile layout, semantic HTML |
| **SEM** | Paid search (Google Ads etc.)    | Almost nothing — it is a campaign/budget activity, not code      |

SEM does benefit from a fast landing page (it improves Google's _Quality Score_
and conversion rate), but spending money on Ads for a portfolio demo is not
recommended. Fix the technical SEO first, then measure.

## What was already correct

- Vite minifies JS/CSS in production; Vercel compresses with Brotli (`content-encoding: br`).
- `index.html` already had an inline critical-CSS block to avoid a flash of unstyled content.
- Hashed asset filenames + code splitting were already in place.
- `document.title` was already updated per route by the router.

## What changed

### Crawlability (P0)

- `apps/web/public/robots.txt` and `sitemap.xml` are now **real static files**.
  Before, `vercel.json`'s catch-all rewrite served the SPA HTML for those paths,
  which returns HTTP 200 but is not a valid robots or sitemap document.
- Admin routes (`/login`, `/overview`, `/projects`, …) and `/api/*` are
  disallowed in `robots.txt`. They are behind a session and have no indexable
  content; the public landing page is the only sitemap entry.

### Metadata (P0)

- `index.html` now includes `canonical`, Open Graph (`og:*`), Twitter card
  tags and a `SoftwareApplication` JSON-LD block. Link previews in WhatsApp,
  Slack and LinkedIn no longer fall back to a bare URL.
- `app.ts` keeps `description`, `og:title`, `og:description`, `og:url` and
  `canonical` in sync with SPA navigation. Non-JS crawlers still see the shell
  metadata — which is correct for `/`.

### Delivery (P0)

- `vercel.json` sets `Cache-Control: public, max-age=31536000, immutable` for
  `/assets/*`. Hashed filenames never change content, so revalidating them on
  every visit was pure waste. `favicon.svg` gets a shorter one-day TTL.
- `apps/web/vite.config.ts` no longer emits source maps by default (about 2 MB
  of unusable build output; Vercel already blocks `/assets/*.map`). Set
  `SOURCEMAPS=1` for a debugging build.
- The font import now loads only the Latin Inter subset. The previous
  `@import '@fontsource-variable/inter'` pulled Cyrillic, Greek and Latin-ext
  faces too — 5 woff2 files instead of 1 (48 kB instead of ~270 kB).

### Measurement (P1)

- `@vercel/analytics` and `@vercel/speed-insights` are initialised once in
  `src/main.ts`, only in production builds. Actual dashboards must be enabled
  in the Vercel project (Analytics → Enable; Speed Insights → Enable). Without
  that, no data is collected.

### Landing page SSR + code splitting (P2)

- The landing page is rendered with the real Aurelia component through
  `@aureliajs/ssr` at **build time** (`scripts/prerender-landing.ts`) and
  written to `dist/landing.html`. `vercel.json` rewrites `/` to that file.
  A full Vercel Function would add cold starts to a page whose content never
  changes, so static prerender is the right form of SSR here.
- `main.ts` removes `[data-ssr-landing]` before mounting the SPA, so users
  never see a duplicate page. Crawlers get complete HTML without executing JS.
- All other route components are dynamic imports in `config/routes.ts`. They
  are downloaded on first visit instead of in the initial bundle. The
  `vendor-zod` chunk is no longer preloaded on first paint.

## How to verify

```bash
bun run build                       # produces apps/web/dist/landing.html
bun test                            # 266 tests, including 4 SEO-output checks
bun run typecheck && bun run lint
vercel build                        # inspect .vercel/output/config.json locally
```

After the next production deploy:

```bash
curl -sSI https://aureliajs.vercel.app/robots.txt           # text/plain, not text/html
curl -sS  https://aureliajs.vercel.app/robots.txt | head    # User-agent: *
curl -sS  https://aureliajs.vercel.app/sitemap.xml | head   # <?xml ...
curl -sSI https://aureliajs.vercel.app/assets/index-*.js    # immutable, max-age=31536000
curl -sS  https://aureliajs.vercel.app/ | grep -c 'data-ssr-landing'   # 1
```

The `scripts/live-smoke.ts` suite already checks `/` and `/api/health`.

> Note: `vercel dev` runs the repo's `bun run dev` (Vite + Hono) rather than
> serving `dist/`, so the `/ → /landing.html` rewrite is not reproducible there.
> Use `vercel build` and inspect `.vercel/output/config.json`, or serve
> `apps/web/dist` with any static server, to verify the production shape.

## What to do after deployment

1. Enable Vercel Analytics and Speed Insights in the dashboard.
2. Wait 24–48 h, then read **LCP**, **INP**, **CLS** and the top referrers.
3. Submit `https://aureliajs.vercel.app/sitemap.xml` in Google Search Console
   and check Coverage → "Indexed".
4. Add a 1200×630 PNG `og:image` (and `twitter:image`) when a social card
   exists. Most crawlers ignore SVG here, so it was deliberately not faked
   with the favicon.
5. Only then consider further bundle work. Optimising without measurements is
   guesswork; the current initial JS is ~120 kB gzipped and the largest single
   chunk (`ui-primitives`) is ~72 kB gzipped.
