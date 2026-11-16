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
import { readFileSync, existsSync } from 'node:fs';
import { aurelia, createAuthMiddleware } from '@hono/aurelia-ssr/server';
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

// Serve static assets (CSS, bundled client script) reliably across any cwd
app.get('/public/*', (c) => {
  const rel = c.req.path.replace(/^\/public\//, '');
  const filePath = resolve(publicDir, rel);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath);
    const mimeType = filePath.endsWith('.css')
      ? 'text/css'
      : filePath.endsWith('.js')
      ? 'application/javascript'
      : 'application/octet-stream';
    return c.body(content, 200, { 'Content-Type': mimeType });
  }
  return c.text('Not found', 404);
});

// Auth Middleware: sets user, workspace, and role in Hono context
app.use('*', createAuthMiddleware({
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
}));

// Route 1: Public Home Page with SSR
app.get(
  '/',
  aurelia({
    component: HomePage,
    title: 'Hono + Aurelia 2 SSR - Engineering Blog',
    streaming: true,
    loaders: {
      posts: async () => posts,
    },
    document: {
      cssBundle: '/public/style.css',
      jsBundle: '/public/client.js',
    },
  })
);

// Route 2: Single Post Detail Page with co-located loader, SSR & Hydration
app.get(
  '/posts/:slug',
  aurelia({
    component: PostDetailPage,
    streaming: true,
    document: {
      cssBundle: '/public/style.css',
      jsBundle: '/public/client.js',
    },
  })
);

// Route 3: Protected Dashboard Page with co-located metadata, loader & SSR
app.get(
  '/dashboard',
  aurelia({
    component: DashboardPage,
    streaming: true,
    document: {
      cssBundle: '/public/style.css',
      jsBundle: '/public/client.js',
    },
  })
);

// REST API Endpoints
app.get('/api/posts', (c) => c.json(posts));

app.get('/api/posts/:slug', (c) => {
  const slug = c.req.param('slug');
  const post = posts.find((p) => p.slug === slug);
  if (!post) return c.json({ error: 'Post not found' }, 404);
  return c.json(post);
});

app.post('/api/posts/:slug/like', (c) => {
  const slug = c.req.param('slug');
  const post = posts.find((p) => p.slug === slug);
  if (!post) return c.json({ error: 'Post not found' }, 404);
  post.claps += 1;
  return c.json({ success: true, claps: post.claps });
});

app.post('/api/posts/:slug/comments', async (c) => {
  const slug = c.req.param('slug');
  const post = posts.find((p) => p.slug === slug);
  if (!post) return c.json({ error: 'Post not found' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'Anonymous';
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!text) {
    return c.json({ error: 'Comment text is required' }, 400);
  }

  const comment = {
    id: Date.now(),
    author,
    text,
    date: 'Just now',
  };
  post.comments.push(comment);

  return c.json({ success: true, comment });
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
    console.log(`   • http://localhost:${info.port}/posts/hono-aurelia-ssr-architecture (Post Detail SSR)`);
    console.log(`   • http://localhost:${info.port}/dashboard?token=demo-token  (Protected SSR Dashboard)`);
    console.log(`   • http://localhost:${info.port}/api/posts                 (JSON Endpoint)`);
  });
}

export { app };
export default {
  port,
  fetch: app.fetch,
};
