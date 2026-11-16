# Aurelia Ops — Examples & Reference Projects

This directory contains reference implementations and R&D projects.
Each example is **standalone** (independent `package.json`, `pnpm install` from its own folder)
but follows the same conventions as the main monorepo.

Use these to learn patterns, experiment, or prototype new features without affecting the
production codebase in `apps/`.

---

## 📂 Available Examples

| Name | Description | Tech | Status |
|------|-------------|------|--------|
| `fullstack-ssr/` | Hono + Aurelia 2 SSR — server-rendered pages + client hydration | Hono, Aurelia 2, JSDOM, Web Streams | ✅ Active Reference |
| `hono-react-ssr-shadcn-ui/` | Comparative SSR Benchmark — React 18 + Cloudflare D1 / Drizzle / shadcn-ui | Hono, React 18, Tailwind, Drizzle | 📦 Reference Benchmark |

---

## 🏗️ fullstack-ssr (Hono + Aurelia SSR)

A minimal example showing how to server-render Aurelia components with Hono,
including hydration payload so the client doesn't need to refetch data.

**Goal**: Demonstrate the `packages/hono-aurelia-ssr` adapter patterns in a standalone
setting, so the main `apps/` monorepo stays focused on the production SPA + API split.

### ✅ Quick Start

```bash
cd examples/fullstack-ssr
pnpm install          # install deps (standalone, not workspace)
pnpm dev              # starts Hono server on http://localhost:3000
```

Then open <http://localhost:3000> in your browser.

### 🌐 Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET /` | Home page | Public, server-rendered with `window.__HYDRATION__` payload |
| `GET /dashboard?token=demo-token` | Protected dashboard | Auth-required, renders user data |
| `GET /api/posts` | JSON API | Public, returns mock posts |
| `GET /health` | Health check | Returns `{ status: 'ok' }` |

### 🔐 Auth (Simplified)

```typescript
// Auth middleware: if token === 'demo-token', user is authenticated
app.use(async (c, next) => {
  const token = c.req.query('token');
  if (token === 'demo-token') {
    c.set('user', { id: 'user-1', name: 'Demo User' });
    c.set('authenticated', true);
  }
  await next();
});
```

**Try it:**
- Without auth: `curl http://localhost:3000/api/dashboard/stats` → `401`
- With auth: `curl 'http://localhost:3000/api/dashboard/stats?token=demo-token'` → `200`

### 📦 Development

```bash
# Watch mode (auto-reload on changes)
pnpm dev

# TypeScript check
pnpm typecheck

# Production build
pnpm build

# Production start
pnpm start
```

### 🐳 Docker (Production)

```bash
# Build the image
docker build -t ssr-example .

# Run it
docker run -p 3000:3000 -e PORT=3000 ssr-example

# Or with compose (if docker-compose.yml exists)
docker-compose up --build
```

### 🌿 Environment Variables

```bash
PORT=3000                 # Server port (default: 3000)
NODE_ENV=production       # Node environment
LOG_LEVEL=info            # Logging level
```

### 🧪 Testing

```bash
# Health check
curl http://localhost:3000/health

# Public route
curl http://localhost:3000/

# Protected route (no auth)
curl http://localhost:3000/api/dashboard/stats  # 401

# Protected route (with auth)
curl 'http://localhost:3000/api/dashboard/stats?token=demo-token'  # 200

# Check hydration payload in browser console
# Open DevTools → Console, look for: ✅ Hydration payload loaded: ...
```

### 📁 Project Structure

```
examples/fullstack-ssr/
├── package.json          # Hono + @hono/node-server
├── tsconfig.json         # TypeScript strict mode
├── src/
│   └── index.ts          # Server + all routes (HTML + JSON APIs)
├── Dockerfile            # Multi-stage production build
├── docker-compose.yml    # Optional: local dev orchestration
├── .env.example          # Environment template
├── README.md             # Detailed example docs
└── test/                 # Vitest unit tests (optional)
```

### 📦 Package Dependencies (package.json)

```json
{
  "dependencies": {
    "hono": "^4.0.0",          // Web framework (lightweight)
    "@hono/node-server": "^1.12.0"  // Server adapter (fetch + listen)
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.4.0",
    "tsx": "^4.0.0"           // Runtime for dev / build / start
  }
}
```

### 🎯 Learning Objectives

This example teaches:

1. **SSR flow**: Server renders HTML → includes `window.__HYDRATION__` → client hydrates
2. **Content negotiation**: `Accept: application/json` → JSON response; `text/html` → HTML
3. **Auth guard**: Middleware checks token, sets `c.get('user')` for component context
4. **Hydration payload**: Server data available immediately, no duplicate API call
5. **Hono patterns**: Route handlers, middleware, `c.json()`, `c.html()`, `c.req.header()`
6. **Docker production build**: Multi-stage, minimal image, `PORT` env var

### 🔄 When to Use This Pattern

| Use case | Choose this (SSR) | Or choose SPA + API (current `apps/`) |
|----------|-------------------|--------------------------------------|
| You want **SSR by default** (SEO, faster FCP) | ✅ Yes | ❌ No (SPA loads JS first) |
| You want **shared code** between server & client (Aurelia components rendered both places) | ✅ Yes | ❌ No (separate bundles) |
| You want **fullstack monorepo** with unified auth + data layer | ✅ Yes | ✅ Yes (your current setup) |
| You want **hydration without API calls** on first paint | ✅ Yes | ✅ Yes (also via `packages/hono-aurelia-ssr`) |
| You're building a **marketing site + admin dashboard** mix | ✅ Yes | ❌ No (separate concerns) |

**TL;DR**: If you're a solo dev or full-stack team wanting one server to rule them all → `examples/fullstack-ssr` pattern. If you have separate FE/BE teams or need independent deployments → `apps/` (SPA + API) pattern.

### 📚 Learn More

- [Hono documentation](https://hono.dev)
- [Aurelia 2 SSR patterns](https://aurelia.io/docs/patterns/ssr)
- [@hono/aurelia-ssr package](../packages/hono-aurelia-ssr) — the library this example showcases
- [Docker multi-stage builds](https://docs.docker.com/develop/develop-images/multistage-build/)

---

## 🛠️ Adding Your Own Example

1. `cd examples/`
2. `mkdir my-feature`
3. Copy the skeleton:
   ```bash
   cp -R fullstack-ssr my-feature
   cd my-feature
   # Edit package.json, tsconfig.json, src/index.ts to suit your need
   pnpm install
   pnpm dev
   ```
4. When done, `rm -rf my-feature` or keep it as a permanent reference.

**Convention**: Each example must be runnable standalone (`pnpm install` + `pnpm dev` from its own folder).
If it imports `@aureliajs/*` from the workspace, it's better placed under `apps/` or `packages/`.

---

## ⚠️ Known Quirks

- **Port 3000** is hardcoded in `src/index.ts` — change `PORT` env var if you need another port.
- **Auth is simplified** — `token === 'demo-token'` is the only valid token. No DB, no JWT, no refresh tokens.
- **Hydration payload is inline** in HTML strings. Real projects would serialize via `packages/hono-aurelia-ssr`.
- **No database** — all data is in-memory (arrays). Add Drizzle + Postgres if you need persistence.

---

## ✅ Verified Working

- Node.js 22+, pnpm 11+
- `pnpm dev` starts server, browser opens automatically (or visit `http://localhost:3000`)
- `pnpm typecheck` passes with strict TS
- `pnpm build` produces `dist/index.js` + `dist/html.d.mts`
- Docker build works on Linux (alpine + arm64 tested)

---

**Built with ❤️ using Hono + Aurelia 2**

*This example exists to explore SSR patterns. The production app lives in `apps/` (SPA + API split).*