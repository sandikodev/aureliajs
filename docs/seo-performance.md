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
  The Vite-built shell is renamed to `dist/app.html` after prerendering:
  Vercel's `filesystem` handler resolves `/` to `index.html` before rewrites
  run, so leaving that file in place made the landing rewrite unreachable.
  Deep links still fall back to the renamed shell.
  A full Vercel Function would add cold starts to a page whose content never
  changes, so static prerender is the right form of SSR here.
- The prerendered file is **static-first**: the SPA entry script and its
  modulepreloads are stripped, leaving only the stylesheet plus a tiny inline
  bootstrap (~20 lines) for the two CTA buttons and the signed-in redirect.
  This matters — an earlier version kept the SPA script and removed the SSR
  DOM before mounting, which made Lighthouse measure the _re-rendered_ text at
  ~5.4 s on throttled mobile. Now there is no re-render at all.
- Signed-in visitors never see the marketing copy. The API sets a non-HttpOnly
  `aurelia_ops_authed=1` hint cookie alongside the real HttpOnly session;
  the inline bootstrap reads it in `<head>` and redirects to `/overview`
  before first paint. The hint grants no access — every API route still checks
  the HttpOnly cookie.
- All non-landing route components are dynamic imports in `config/routes.ts`.
  They are downloaded on first visit instead of in the initial bundle. Landing
  stays eager in the SPA because the router needs the default route to resolve
  its `fallback` (AUR3174 otherwise) — but static `/` never loads that bundle.

## Headless Lighthouse audit

Run against a local static server serving `apps/web/dist` with the same
`/ → landing.html` rewrite as production (the API only needs to be up for the
signed-in path; the anonymous landing makes no API calls):

```bash
CHROME_PATH=/home/dev/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome \
LD_LIBRARY_PATH=/home/dev/.local/lib/chrome-deps/usr/lib/x86_64-linux-gnu \
bunx lighthouse http://localhost:5098/ --headless --no-sandbox \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=/tmp/lh.json \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"
```

Add `--preset=desktop` for the desktop profile. Results on 23 Nov 2026:

| Profile                       | Performance | Accessibility | Best practices | SEO     | LCP   | CLS   |
| ----------------------------- | ----------- | ------------- | -------------- | ------- | ----- | ----- |
| Mobile (simulated throttling) | **100**     | **100**       | **100**        | **100** | 1.1 s | 0     |
| Desktop                       | **100**     | **100**       | **100**        | **100** | 0.3 s | 0.052 |

The live production baseline before this work scored 96 / 100 / 100 / 91;
the only SEO failure was the invalid `robots.txt`, now fixed. Remaining
non-scoring audit notes are unused CSS (~10 KiB), render-blocking CSS and
document latency — all small on this page and not worth regressing the design
for.

## How to verify

```bash
bun run build                       # produces apps/web/dist/landing.html
bun test                            # 275 tests, including 4 SEO-output checks and 2 session-cookie checks
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

1. Enable Vercel Analytics and Speed Insights in the dashboard. The landing
   page ships no framework JS, so its pageviews only appear if platform-level
   injection is enabled there; the SPA routes are covered by `main.ts`.
2. Wait 24–48 h, then read **LCP**, **INP**, **CLS** and the top referrers.
3. Submit `https://aureliajs.vercel.app/sitemap.xml` in Google Search Console
   and check Coverage → "Indexed".
4. Only then consider further bundle work. Optimising without measurements is
   guesswork; the current initial JS is ~120 kB gzipped and the largest single
   chunk (`ui-primitives`) is ~72 kB gzipped.

The 1200×630 social card is `apps/web/public/og-image.png` (generated with the
host's Antigravity `image-generator` subagent, then quantised from 707 kB to
318 kB with `pngquant`). Both `og:image` and `twitter:image` point at it.
