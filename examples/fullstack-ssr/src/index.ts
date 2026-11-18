/**
 * Hono + Aurelia 2 SSR Reference Implementation
 *
 * Demonstrates idiomatic, zero-boilerplate meta-framework composition:
 * - Real Aurelia 2 Single-File Component (.aux) server-side rendering
 * - Thin @hono/aurelia route & action adapters (aurelia + aureliaAction)
 * - Native Bun static asset streaming via hono/bun (zero-copy kernel I/O)
 * - Composable Hono auth middleware (requireAuth)
 * - Scoped aureliaDefaults middleware with streaming & opt-in dataEndpoint
 * - Automated client-side hydration via createClientHydrator
 */

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { aurelia, aureliaAction, aureliaDefaults } from '@hono/aurelia';
import { initialPosts, dashboardStats, activityStream } from './data.js';

// Clean Aurelia 2 Page Components
import { HomePage } from './pages/home.aux';
import { PostDetailPage } from './pages/post-detail.aux';
import { DashboardPage } from './pages/dashboard.aux';
import { registerShowcaseRoutes } from './routes/showcase.js';

type AppEnv = {
  Variables: {
    user: { id: string; email: string; name: string } | null;
    role: string | null;
  };
};

const app = new Hono<AppEnv>();

// Favicon route
app.get('/favicon.ico', (c) => {
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ed2578"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold">Au</text></svg>`;
  return c.body(faviconSvg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=86400',
  });
});

// Universal static asset streaming (Cloudflare Workers ASSETS binding or Bun zero-copy I/O)
app.use('/public/*', async (c, next) => {
  const env = c.env as { ASSETS?: { fetch: typeof fetch } } | undefined;
  if (env?.ASSETS) {
    return env.ASSETS.fetch(c.req.raw);
  }
  if (typeof Bun !== 'undefined') {
    const { serveStatic } = await import('hono/bun');
    return serveStatic({
      root: './',
      rewriteRequestPath: (path) => path.replace(/^\/public/, 'public'),
    })(c, next);
  }
  return next();
});

// Scoped Aurelia SSR Defaults: Streaming + opt-in JSON data endpoint + document bundles
app.use(
  '*',
  aureliaDefaults<AppEnv>({
    document: {
      cssBundle: '/public/style.css',
      jsBundle: '/public/client.js',
    },
    streaming: true,
    dataEndpoint: true,
  })
);

// Idiomatic Hono session resolution middleware
app.use('*', async (c, next) => {
  const token =
    c.req.query('token') || c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token === 'demo-token') {
    c.set('user', { id: 'usr_1', email: 'operator@aureliajs.dev', name: 'Demo Operator' });
    c.set('role', 'owner');
  }
  await next();
});

// Composable Hono auth guard middleware
const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
  }
  await next();
  return;
});

// --- Clean Aurelia 2 SSR & Action Routes ---
app.get('/', aurelia(HomePage));
app.get('/posts/:slug', aurelia(PostDetailPage));
app.post('/posts/:slug', aureliaAction(PostDetailPage));
app.get('/dashboard', requireAuth, aurelia(DashboardPage));

// Register showcase routes (Zero-JS Selective Hydration & Polyglot Bridge)
registerShowcaseRoutes(app);

// Standard JSON API Endpoints
app.get('/api/posts', (c) => c.json(initialPosts));
app.get('/api/dashboard/stats', requireAuth, (c) =>
  c.json({ stats: dashboardStats, activity: activityStream })
);
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = parseInt(process.env.PORT || '3000', 10);

if (process.env.NODE_ENV !== 'test' && import.meta.main) {
  console.log(`\n🚀 Native Bun Aurelia 2 SSR + Hono Server running on http://localhost:${port}`);
}

export { app };
export default {
  port,
  fetch: app.fetch,
};
