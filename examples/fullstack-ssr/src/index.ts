/**
 * Hono + Aurelia 2 SSR Reference Implementation
 * 
 * Demonstrates:
 * - Real Aurelia 2 Single-File Component (.aux) server-side rendering
 * - Thin @hono/aurelia route adapter with zero glue code
 * - Co-located loaders & actions (<script server>)
 * - Request-scoped isolation per request
 * - Automated client-side hydration via createClientHydrator
 * - Protected routes with auth guards
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aurelia, aureliaDefaults, serveAureliaAssets } from '@hono/aurelia';
import { initialPosts, dashboardStats, activityStream } from './data.js';
import { HomePage } from './pages/home.aux';
import { PostDetailPage } from './pages/post-detail.aux';
import { DashboardPage } from './pages/dashboard.aux';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

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

// Serve static assets (CSS, client hydration script)
app.use('/public/*', serveAureliaAssets({ root: publicDir }));

// Global Aurelia SSR Defaults: Streaming enabled + standard document bundles
app.use(
  '*',
  aureliaDefaults({
    document: {
      cssBundle: '/public/style.css',
      jsBundle: '/public/client.js',
    },
    streaming: true,
  })
);

// Standard idiomatic Hono auth middleware
app.use('*', async (c, next) => {
  const token = c.req.query('token') || c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token === 'demo-token') {
    c.set('user', { id: 'usr_1', email: 'operator@aureliajs.dev', name: 'Demo Operator' });
    c.set('role', 'owner');
  }
  await next();
});

// --- One-Liner Aurelia SSR Routes (.aux SFCs with co-located loaders & actions) ---
app.get('/', aurelia(HomePage));
app.all('/posts/:slug', aurelia(PostDetailPage));
app.get('/dashboard', aurelia(DashboardPage));

// JSON Endpoints
app.get('/api/posts', (c) => c.json(initialPosts));
app.get('/api/dashboard/stats', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ stats: dashboardStats, activity: activityStream });
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = parseInt(process.env.PORT || '3000', 10);

if (process.env.NODE_ENV !== 'test' && !('bun' in process.versions)) {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`\n🚀 Real Aurelia 2 SSR + Hono Server running`);
      console.log(`📍 URL: http://localhost:${info.port}`);
      console.log(`\n🔗 Test routes:`);
      console.log(`   • http://localhost:${info.port}/                          (Public SSR Home)`);
      console.log(`   • http://localhost:${info.port}/posts/hono-aurelia-architecture (Post Detail SSR)`);
      console.log(`   • http://localhost:${info.port}/dashboard?token=demo-token  (Protected SSR Dashboard)`);
    }
  );
}

export { app };
export default {
  port,
  fetch: app.fetch,
};
