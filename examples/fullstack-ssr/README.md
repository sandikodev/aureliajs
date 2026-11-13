# Hono + Aurelia SSR Example

**Minimal working example** of Server-Side Rendering with Hono and Aurelia 2, demonstrating the `@hono/aurelia-ssr` library in action.

## What This Shows

- ✅ **Single server monorepo** (NOT split apps/ structure) — following Hono conventions
- ✅ **Server-side rendering** with Aurelia components
- ✅ **Client-side hydration** — prevent duplicate API calls
- ✅ **Data loaders** — parallel data fetching before render
- ✅ **Auth guards** — requiresAuth validation
- ✅ **Content negotiation** — JSON or HTML based on Accept header
- ✅ **Error handling** — graceful fallbacks

## Project Structure

```
examples/fullstack-ssr/
├── src/
│   ├── index.ts           # Hono app setup + routes
│   └── pages/
│       ├── home.ts        # Home page (public)
│       ├── dashboard.ts   # Dashboard (protected)
│       └── not-found.ts   # 404 fallback
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Running

```bash
# Install dependencies
pnpm install

# Start dev server (watches for changes)
pnpm dev

# Open in browser
# http://localhost:3000              → Home (public)
# http://localhost:3000/dashboard    → Dashboard (protected, need auth)
```

## Key Routes

| Route | Auth Required | Loaders | Notes |
|-------|--------------|---------|-------|
| `GET /` | No | posts | Home page with example posts |
| `GET /dashboard` | Yes | stats, recentActivity | Protected dashboard |
| `GET *` | No | — | 404 fallback |

## How It Works

### 1. Server-Side Rendering (index.ts)

```typescript
app.get('/dashboard', aurelia({
  component: DashboardPage,
  title: 'Dashboard',
  requiresAuth: true,
  loaders: {
    stats: async (c) => {
      // Fetch data BEFORE rendering
      return getStats();
    },
    recentActivity: async (c) => {
      return getActivity();
    },
  },
}));
```

The `aurelia()` handler:
1. Checks auth (returns 401 if not authenticated)
2. Executes loaders in parallel (stats + recentActivity)
3. Renders component with loaded data on server
4. Sends HTML + hydration payload to client

### 2. Client-Side Hydration

The browser receives:
- HTML: `<div id="app">Dashboard content</div>`
- Payload: `window.__HYDRATION__` containing auth + data
- Client-side code calls `hydrateFromServer()` to:
  - Extract auth context
  - Load initial data from window
  - **Prevent duplicate API calls** (server already fetched)

### 3. Data Loading Pattern

Loaders run in parallel BEFORE rendering:

```typescript
loaders: {
  stats: async (c) => { /* 100ms */ },
  recentActivity: async (c) => { /* 200ms */ },
}
// Total: ~200ms (parallel, not sequential)
```

If a loader fails, the page still renders with partial data. Configure fallback strategy:
- `fallback: 'error'` → return 500 error page
- `fallback: 'spa'` → render empty shell for client (SPA mode)

## Authentication Demo

To test protected pages:

```bash
# Without token (should return 401):
curl http://localhost:3000/dashboard

# With valid token:
curl -H "Authorization: Bearer demo-token" http://localhost:3000/dashboard
```

Valid token: `demo-token` → sets user context

## Content Negotiation

The same route returns different formats:

```bash
# Request HTML (browser default)
curl -H "Accept: text/html" http://localhost:3000/dashboard

# Request JSON (API clients)
curl -H "Accept: application/json" http://localhost:3000/dashboard
# Returns: { component, context, initialData, timestamp }
```

## Real-World Patterns

### Add New Protected Page

```typescript
// pages/settings.ts
export const SettingsPage = { /* ... */ };

// index.ts
app.get('/settings', aurelia({
  component: SettingsPage,
  title: 'Settings',
  requiresAuth: true,
  loaders: {
    userPrefs: async (c) => {
      return await db.userSettings.get(c.get('user').id);
    },
  },
}));
```

### Route Group with Defaults

```typescript
const adminRoutes = createAureliaRouteGroup({
  requiresAuth: true,
  fallback: 'error',
});

app.get('/admin', adminRoutes.handler(AdminPage, 'Admin'));
app.get('/admin/users', adminRoutes.handler(UsersPage, 'Users'));
```

### Custom Auth Middleware

```typescript
app.use(
  createAuthMiddleware({
    getUserFromToken: async (token) => {
      return await verifyJWT(token);
    },
    getWorkspaceFromRequest: async (c) => {
      const subdomain = c.req.header('host').split('.')[0];
      return await db.workspaces.getBySubdomain(subdomain);
    },
  })
);
```

## Why Single Server?

✅ Simpler to understand — all code in one place
✅ Easier to deploy — one process instead of two
✅ Matches Hono conventions — like Hono JSX examples
✅ Better data loading — no extra network calls between services

(Monorepo pattern is shown separately in docs if needed)

## Trade-offs

| Aspect | Single Server | Separate API |
|--------|---------------|--------------|
| Complexity | ✅ Lower | ❌ Higher |
| Setup time | ✅ 5 mins | ❌ 20 mins |
| Scaling | ⚠️ Coupled | ✅ Independent |
| Reusability | ⚠️ Code duplication | ✅ Shared API |

For **production**, consider monorepo if you need:
- Independent scaling (web ≠ API)
- Shared API (multiple clients)
- Team separation

For **learning/MVP**, single server is optimal.

## Next Steps

1. Run this example
2. Try adding a new page
3. Implement real data loaders
4. Read `@hono/aurelia-ssr` docs
5. Build your own app!

## Debugging

Enable debug mode in browser console:

```typescript
// Check hydration payload
window.__HYDRATION__

// Or use client-side APIs
import { peekHydrationPayload } from '@hono/aurelia-ssr';
console.log(peekHydrationPayload());
```

## See Also

- [@hono/aurelia-ssr](../../packages/hono-aurelia-ssr/README.md) — Library docs
- [Architecture](../../docs/architecture.md) — Design patterns
- [Hono Docs](https://hono.dev) — Framework reference
