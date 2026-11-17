/**
 * Hono + Aurelia 2 SSR Reference Implementation
 * 
 * Demonstrates:
 * - Real Aurelia 2 component server-side rendering
 * - Isolated request-scoped DOM platforms per request
 * - Data loaders with automatic state injection into window.__HYDRATION__
 * - Interactive client-side hydration via Aurelia.enhance
 * - Protected routes with auth guards
 * - Fullstack REST APIs & Static asset delivery
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aurelia,
  aureliaDefaults,
  serveAureliaAssets,
  createAuthMiddleware,
} from '@hono/aurelia/server';
import { initialPosts, dashboardStats, activityStream } from './data.js';
import { HomePage } from './pages/home.js';
import { PostDetailPage } from './pages/post-detail.js';
import { DashboardPage } from './pages/dashboard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

// Clone in-memory data store for live interactivity (likes, comments)
const posts = initialPosts.map((p) => ({ ...p, comments: [...p.comments] }));

type AppEnv = {
  Variables: {
    user: { id: string; email: string; name: string } | null;
    workspace: { id: string; name: string } | null;
    role: string | null;
  };
};

const app = new Hono<AppEnv>();

// Favicon route (eliminates 404 in browsers)
app.get('/favicon.ico', (c) => {
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ed2578"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold">Au</text></svg>`;
  return c.body(faviconSvg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=86400',
  });
});

// Serve static assets (CSS, bundled client script) reliably using framework middleware
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

// Auth Middleware: sets user, workspace, and role in Hono context
app.use(
  '*',
  createAuthMiddleware({
    getUserFromToken: async (token) => {
      if (token === 'demo-token') {
        return { id: 'usr_1', email: 'operator@aureliajs.dev', name: 'Demo Operator' };
      }
      return null;
    },
    getWorkspaceFromRequest: async () => ({
      id: 'ws_demo',
      name: 'Northwind Studio',
    }),
    getRoleForUser: () => 'owner',
  })
);

// Route 1: Public Home Page with SSR (loaders enrich initial posts)
app.get(
  '/',
  aurelia({
    component: HomePage,
    title: 'Hono + Aurelia 2 SSR - Engineering Blog',
    loaders: {
      posts: async () => posts,
    },
  })
);

// Route 2: Single Post Detail Page (One-liner! Co-located loader, actions & metadata)
app.all('/posts/:slug', aurelia(PostDetailPage));

// Route 3: Protected Dashboard Page (One-liner! Co-located loader, auth guard & metadata)
app.get('/dashboard', aurelia(DashboardPage));

// External REST API Endpoints (for mobile apps / webhooks)
app.get('/api/posts', (c) => c.json(posts));

app.get('/api/posts/:slug', (c) => {
  const slug = c.req.param('slug');
  const post = posts.find((p) => p.slug === slug);
  if (!post) return c.json({ error: 'Post not found' }, 404);
  return c.json(post);
});

app.get('/api/dashboard/stats', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(dashboardStats);
});

app.get('/api/dashboard/activity', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(activityStream);
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = parseInt(process.env.PORT || '3000', 10);

if (process.env.NODE_ENV !== 'test' && !('bun' in process.versions)) {
  serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    console.log(`\n🚀 Real Aurelia 2 SSR + Hono Reference Server running (Node.js)`);
    console.log(`📍 URL: http://localhost:${info.port}`);
    console.log(`\n🔗 Test routes:`);
    console.log(`   • http://localhost:${info.port}/                          (Public SSR Home)`);
    console.log(`   • http://localhost:${info.port}/posts/hono-aurelia-architecture (Post Detail SSR)`);
    console.log(`   • http://localhost:${info.port}/dashboard?token=demo-token  (Protected SSR Dashboard)`);
    console.log(`   • http://localhost:${info.port}/api/posts                 (JSON Endpoint)`);
  });
}

export { app };
export default {
  port,
  fetch: app.fetch,
};
