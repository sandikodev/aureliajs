# Strategic Decision: Library Direction

**Finding:** `/apps/web` sudah solved flickering dengan clean SPA pattern + localStorage caching.

**Implication:** Library `@hono/aurelia-ssr` **TIDAK DIBUTUHKAN** oleh `/apps` karena architecture mereka berbeda.

---

## Two Distinct Use Cases

### Use Case A: SPA + Separate API (Production Dashboard)

**Architecture:** `/apps` monorepo
```
/apps/web   → Pure SPA (Vite dev server, port 4600)
/apps/api   → Pure JSON API (Hono, port 4601)
/apps/shared → Shared types (Zod schemas)
```

**Deployment:**
- Web: Static hosting (Cloudflare Pages, Vercel, Netlify)
- API: Node server (Cloudflare Workers, Fly.io, Railway)
- Completely independent scaling

**Advantages:**
- ✅ Independent deployments
- ✅ CDN-friendly (web is static files)
- ✅ Clear separation of concerns
- ✅ Easiest to scale (CDN for web, workers for API)
- ✅ Cheapest (static hosting is free)

**Flicker Solution:**
- Use localStorage caching (`session-cache.ts`)
- First load: spinner (unavoidable)
- Subsequent: instant (cached)
- This is **acceptable** for authenticated apps

**Who benefits:** SaaS companies, admin dashboards, internal tools

---

### Use Case B: Fullstack SSR (Integrated Server)

**Architecture:** `/examples/fullstack-ssr`
```
Single Hono server:
  - Serves HTML (SSR rendered)
  - Serves JSON API
  - Serves static assets
```

**Deployment:**
- Single Node server (port 3000)
- Everything runs together
- No separation

**Advantages:**
- ✅ Zero flicker (content in initial HTML)
- ✅ SEO-friendly (crawlers see full content)
- ✅ Faster TTFB (server-side rendering)
- ✅ Single deployment unit

**Flicker Solution:**
- Server renders HTML with content
- No client-side auth check
- No loading spinner at all
- This is **ideal** for public-facing sites

**Who benefits:** Marketing sites, blogs, public apps

---

## Library Usage Matrix

| Aspect | `/apps` (SPA) | `/examples` (SSR) |
|--------|---------------|-------------------|
| **Uses @hono/aurelia-ssr?** | ❌ NO | ✅ YES |
| **Flicker issue?** | Mild (cached) | None |
| **Architecture** | Separated | Integrated |
| **Deployment** | 2 servers | 1 server |
| **Hosting cost** | $0-$5/mo | $5-$15/mo |
| **Scaling** | Excellent | Good |
| **SEO** | Requires work | Built-in |
| **DX** | Familiar | Learning curve |

---

## Recommendation

### For /apps (Monorepo SPA)

**DO:**
- ✅ Keep SPA architecture (already optimal)
- ✅ Use localStorage caching (implemented)
- ✅ Deploy web to CDN, API to workers
- ✅ Focus on bundle size optimization
- ✅ Improve API response times (caching, indexes)

**DON'T:**
- ❌ Migrate to SSR (architecture mismatch)
- ❌ Merge web + API servers (loses deployment flexibility)
- ❌ Fight the SPA model (it's the right choice here)

**Why:** SPA is **optimal** for authenticated dashboards. Flicker already minimized with cache. SSR would add complexity without meaningful benefit.

---

### For @hono/aurelia-ssr Library

**DO:**
- ✅ Market for **public-facing apps** (marketing, blogs)
- ✅ Highlight SEO benefits
- ✅ Emphasize zero-flicker first load
- ✅ Target fullstack developers
- ✅ Build examples for Next.js refugees

**DON'T:**
- ❌ Position as solution for admin dashboards
- ❌ Claim SPA architecture is "wrong"
- ❌ Force SSR where it doesn't fit

**Why:** SSR shines for **public content**, not authenticated apps.

---

## Future Library Evolution

### Two Packages (Eventually)

Split library into two clear offerings:

#### Package 1: `@hono/aurelia` (SPA Helpers)

**Target:** Monorepo SPA + API pattern (like `/apps`)

**Features:**
- Type-safe API client generation
- Auth session helpers
- localStorage caching utilities
- Shared schema validation (Zod)
- Deployment helpers (static + serverless)

**Pitch:** "Build modern SPA + API faster"

**Example:**
```typescript
import { createApiClient } from '@hono/aurelia';

const api = createApiClient({
  baseURL: '/api',
  cache: 'localStorage',
  auth: 'cookie'
});

// Fully typed, cached, session-aware
const projects = await api.projects.list();
```

---

#### Package 2: `@hono/aurelia-ssr` (Fullstack SSR)

**Target:** Integrated fullstack apps (like `/examples`)

**Features:**
- Server-side rendering
- Hydration utilities
- Data loaders
- SEO helpers
- Single-server deployment

**Pitch:** "Next.js simplicity, Hono performance"

**Example:**
```typescript
import { aurelia } from '@hono/aurelia-ssr';

app.get('/', aurelia({
  component: HomePage,
  loaders: { data: async () => fetchData() }
}));
```

---

## Decision Framework

**When to use SPA + API (Package 1):**
- ✅ Authenticated app
- ✅ Admin dashboard
- ✅ Internal tools
- ✅ Want CDN hosting
- ✅ Need independent scaling

**When to use Fullstack SSR (Package 2):**
- ✅ Public-facing site
- ✅ Marketing pages
- ✅ Blog or content site
- ✅ SEO is critical
- ✅ Zero-flicker required

---

## Conclusion

**`/apps` is ALREADY correct.** It doesn't need SSR because:
1. Authenticated app (no SEO concern)
2. Flicker minimized with cache
3. SPA allows best deployment (CDN + workers)
4. Architecture separation is a feature, not a bug

**`@hono/aurelia-ssr` is for different use case:** Public apps, marketing, SEO-driven content.

**Library should NOT claim** to "fix" SPA dashboards. It's for a **different audience** with **different requirements**.

**Next step:** Build `/examples/fullstack-ssr` as the **reference implementation** for SSR use case, while leaving `/apps` as the **reference for SPA** use case.

Two patterns, two audiences, two packages. Clear separation of concerns. ✅