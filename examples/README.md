# Aurelia Ops — Examples & Reference Projects

This directory contains reference implementations and R&D projects.
Each example is **standalone** (independent `package.json`, `bun install` from its own folder)
but follows the same conventions as the main monorepo.

Use these to learn patterns, experiment, or prototype new features without affecting the
production codebase in `apps/`.

---

## 📂 Available Examples

| Name | Description | Tech | Status |
|------|-------------|------|--------|
| `fullstack-ssr/` | Hono + Aurelia 2 SSR — canonical server-rendered pages + Zero-JS client hydration | Hono, Aurelia 2, LinkeDOM/JSDOM, Web Streams | ✅ Canonical Reference |
| `aurelia-ssr/` | Pure Aurelia 2 SSR Engine — framework-agnostic SSR without Hono or Express | Aurelia 2, @aureliajs/ssr, native Bun.serve / Node | ✅ Canonical Reference |
| `aurelia-bridge/` | Aurelia 2 Polyglot Bridge — zero glue code multi-framework interop | Aurelia 2, @aureliajs/bridge, React 19, Vue 3, Svelte 5, Solid | ✅ Canonical Reference |
| `aurelia-aux/` | Aurelia 2 Single-File Components (.aux) — script setup, scoped CSS, zero-boilerplate SFCs | Aurelia 2, @aureliajs/vite-plugin-aux, Vite 8, Bun | ✅ Canonical Reference |
| `aurelia-islands/` | Aurelia 2 Zero-JS Islands Architecture — selective progressive hydration | Aurelia 2, @aureliajs/islands, IntersectionObserver | ✅ Canonical Reference |

*(Note: Comparative benchmarks such as React SSR are housed under [`benchmarks/reference-react-ssr/`](../benchmarks/reference-react-ssr/) to keep `examples/` strictly Aurelia 2 native).*

---

## 🏗️ fullstack-ssr (Hono + Aurelia SSR)

A minimal example showing how to server-render Aurelia components with Hono,
including hydration payload so the client doesn't need to refetch data.

**Goal**: Demonstrate the `packages/hono-aurelia` adapter patterns in a standalone
setting, so the main `apps/` monorepo stays focused on the production SPA + API split.

### ✅ Quick Start

```bash
cd examples/fullstack-ssr
bun install          # install deps (standalone, not workspace)
bun run dev              # starts Hono server on http://localhost:3000
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
bun run dev

# TypeScript check
bun run typecheck

# Production build
bun run build

# Production start
bun run start
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
└── test/                 # Bun native tests (`bun test`) (optional)
```

### 📦 Package Dependencies (package.json)

```json
{
  "dependencies": {
    "@aureliajs/ssr": "workspace:*",
    "@hono/aurelia": "workspace:*",
    "@hono/node-server": "^1.12.0",
    "aurelia": "^2.0.0-rc.2",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.4.0"
  }
}
```

### 🎯 Learning Objectives

This example teaches:

1. **SSR Flow**: Server renders pure Aurelia 2 components (`HomePage`, `PostDetailPage`, `DashboardPage`) → embeds `<script id="__AURELIA_SSR_DATA__" type="application/json">` → client hydrates with zero flash.
2. **Streaming SSR**: Real Web Streams incremental rendering via `@hono/aurelia` with `streaming: true`.
3. **Content Negotiation**: `Accept: application/json` returns pure JSON DTOs; `text/html` renders SSR HTML.
4. **Co-located Static Actions**: Form mutations handled via `aureliaAction()` directly on the component.
5. **Auth Guards**: Middleware authenticates requests and provides user context cleanly via Aurelia DI.
6. **Zero-Copy Static Asset Serving**: Native Bun kernel file streaming and Cloudflare Workers ASSETS binding compatibility.

### 🔄 When to Use This Pattern

| Use case | Choose this (SSR) | Or choose SPA + API (current `apps/`) |
|----------|-------------------|--------------------------------------|
| You want **SSR by default** (SEO, faster FCP) | ✅ Yes | ❌ No (SPA loads JS first) |
| You want **shared code** between server & client (Aurelia components rendered both places) | ✅ Yes | ❌ No (separate bundles) |
| You want **fullstack monorepo** with unified auth + data layer | ✅ Yes | ✅ Yes (your current setup) |
| You want **hydration without API calls** on first paint | ✅ Yes | ✅ Yes (also via `packages/hono-aurelia`) |
| You're building a **marketing site + admin dashboard** mix | ✅ Yes | ❌ No (separate concerns) |

**TL;DR**: If you're a solo dev or full-stack team wanting one server to rule them all → `examples/fullstack-ssr` pattern. If you have separate FE/BE teams or need independent deployments → `apps/` (SPA + API) pattern.

### 📚 Learn More

- [Hono documentation](https://hono.dev)
- [Aurelia 2 SSR patterns](https://aurelia.io/docs/patterns/ssr)
- [@hono/aurelia package](../packages/hono-aurelia) — the library this example showcases
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
   bun install
   bun run dev
   ```
4. When done, `rm -rf my-feature` or keep it as a permanent reference.

**Convention**: Each example must be runnable standalone (`bun install` + `bun run dev` from its own folder).
If it imports `@aureliajs/*` from the workspace, it's better placed under `apps/` or `packages/`.

---

## ⚠️ Known Quirks

- **Port 3000** is default in `src/index.ts` — configurable via `PORT` environment variable.
- **Auth is simplified** — `token === 'demo-token'` serves as the demo token for telemetry routes.
- **Automated Hydration**: Production-grade client hydration payloads are serialized directly by `@hono/aurelia` and `@aureliajs/ssr` with full XSS security escaping.
- **In-memory data store** — articles and telemetry metrics are kept in memory for zero-dependency standalone execution.

---

## ✅ Verified Working

- Bun 1.2+
- `bun run dev` starts server, browser opens automatically (or visit `http://localhost:3000`)
- `bun run typecheck` passes with strict TS
- `bun run build` produces `dist/index.js` + `dist/html.d.mts`
- Docker build works on Linux (alpine + arm64 tested)

---

**Built with ❤️ using Hono + Aurelia 2**

*This example exists to explore SSR patterns. The production app lives in `apps/` (SPA + API split).*