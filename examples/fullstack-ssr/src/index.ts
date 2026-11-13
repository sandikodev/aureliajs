/**
 * Hono + Aurelia SSR Example
 * 
 * Production-ready example showing:
 * - Server-side rendering with Aurelia components
 * - Client-side hydration (no duplicate API calls)
 * - Protected routes with auth guards
 * - Parallel data loaders
 * - Content negotiation (HTML vs JSON)
 * - Error handling
 * 
 * Run with: pnpm dev
 * Open: http://localhost:3000
 */

import { Hono } from 'hono';
import { serveStatic } from 'hono/node-server/serve-static';
import { aurelia, createAuthMiddleware } from '@hono/aurelia-ssr';

// Import pages
import { HomePage } from './pages/home.js';
import { DashboardPage } from './pages/dashboard.js';
import { NotFoundPage } from './pages/not-found.js';

// Create app
const app = new Hono();

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Static files (public assets)
app.use('/public/*', serveStatic({ root: './' }));

// Auth middleware - validates user context
// This middleware runs BEFORE specific routes to establish user/workspace context
app.use(
  createAuthMiddleware({
    // Validate and extract user from auth token (cookie, header, etc.)
    getUserFromToken: async (token: string | undefined) => {
      if (!token) return null;

      // Example: validate JWT or session token
      // In real apps: verify JWT signature or lookup session in database
      if (token === 'demo-token') {
        return {
          id: 'user-1',
          email: 'demo@example.com',
          name: 'Demo User',
        };
      }

      // Token invalid
      return null;
    },

    // Extract workspace context from request
    getWorkspaceFromRequest: async (c) => {
      // Example: extract workspace from query param or subdomain
      const workspace = c.req.query('ws') || 'default';

      // Validate workspace identifier
      if (!/^[a-z0-9-]+$/.test(workspace)) {
        throw new Error('Invalid workspace identifier');
      }

      return {
        id: `ws-${workspace}`,
        name: workspace.charAt(0).toUpperCase() + workspace.slice(1),
      };
    },

    // Determine user role in workspace
    getRoleForUser: (user: any, workspace: any) => {
      // In real apps: query database for user's role in workspace
      return user.id === 'user-1' ? 'admin' : 'viewer';
    },
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (No auth required)
// ═══════════════════════════════════════════════════════════════════════════

// Home page - public, demonstrates data loading
app.get(
  '/',
  aurelia({
    component: HomePage,
    title: 'Home - Hono + Aurelia SSR Example',
    requiresAuth: false,
    loaders: {
      posts: async (c) => {
        // Simulate data loader - in real apps, fetch from database
        // This runs on the server and data is pre-rendered in HTML
        return [
          { id: 1, title: 'Getting Started with Aurelia 2', slug: 'getting-started-aurelia-2' },
          { id: 2, title: 'Hono Best Practices for SSR', slug: 'hono-best-practices-ssr' },
          { id: 3, title: 'Server-Side Rendering in 2026', slug: 'ssr-in-2026' },
          { id: 4, title: 'Hydration Patterns Explained', slug: 'hydration-patterns' },
          { id: 5, title: 'TypeScript with Aurelia', slug: 'typescript-aurelia' },
        ];
      },
    },
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (Auth required)
// ═══════════════════════════════════════════════════════════════════════════

// Dashboard - protected route with multiple data loaders (parallel execution)
app.get(
  '/dashboard',
  aurelia({
    component: DashboardPage,
    title: 'Dashboard - Hono + Aurelia SSR Example',
    requiresAuth: true,
    loaders: {
      // Loader 1: Dashboard statistics
      stats: async (c) => {
        // Access authenticated user from context
        const user = c.get('user');

        if (!user) {
          throw new Error('Unauthorized - user not found');
        }

        // Simulate fetching from database
        // In production: query database with user context
        return {
          stats: {
            title: `Welcome, ${user.name}!`,
            views: Math.floor(Math.random() * 10000),
            posts: Math.floor(Math.random() * 100),
            engagement: Math.floor(Math.random() * 95) + 5,
          },
        };
      },

      // Loader 2: Recent activity
      // Runs in parallel with stats loader!
      activity: async (c) => {
        const user = c.get('user');

        if (!user) {
          throw new Error('Unauthorized - user not found');
        }

        // Simulate fetching user activity
        return {
          activity: [
            {
              id: 1,
              type: 'post' as const,
              action: 'Published "Getting Started with Aurelia"',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 2,
              type: 'comment' as const,
              action: 'Replied to comment on SSR guide',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 3,
              type: 'like' as const,
              action: 'Someone liked your Hono guide',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        };
      },
    },
    // Fallback behavior when loaders fail
    fallback: 'error',
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES (for client-side data fetching)
// ═══════════════════════════════════════════════════════════════════════════

// API: Get posts (for non-hydrated clients or refresh)
app.get('/api/posts', (c) => {
  return c.json([
    { id: 1, title: 'Getting Started with Aurelia 2', slug: 'getting-started-aurelia-2' },
    { id: 2, title: 'Hono Best Practices for SSR', slug: 'hono-best-practices-ssr' },
    { id: 3, title: 'Server-Side Rendering in 2026', slug: 'ssr-in-2026' },
    { id: 4, title: 'Hydration Patterns Explained', slug: 'hydration-patterns' },
    { id: 5, title: 'TypeScript with Aurelia', slug: 'typescript-aurelia' },
  ]);
});

// API: Get dashboard stats (for non-hydrated clients or refresh)
app.get('/api/dashboard/stats', (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    stats: {
      title: `Welcome, ${user.name}!`,
      views: Math.floor(Math.random() * 10000),
      posts: Math.floor(Math.random() * 100),
      engagement: Math.floor(Math.random() * 95) + 5,
    },
  });
});

// API: Get dashboard activity (for non-hydrated clients or refresh)
app.get('/api/dashboard/activity', (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    activity: [
      {
        id: 1,
        type: 'post',
        action: 'Published "Getting Started with Aurelia"',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        type: 'comment',
        action: 'Replied to comment on SSR guide',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        type: 'like',
        action: 'Someone liked your Hono guide',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 404 FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

// Catch-all 404 handler
app.all(
  '*',
  aurelia({
    component: NotFoundPage,
    title: '404 - Not Found',
    requiresAuth: false,
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

// Global error handler
app.onError((error, c) => {
  console.error('[ssr-example] Error:', error);

  // Render error page as HTML
  if (error instanceof Error) {
    return c.html(
      `
      <html>
        <head>
          <title>Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 4rem auto;
              padding: 2rem;
              color: #333;
            }
            h1 { color: #dc2626; }
            pre { 
              background: #f3f4f6;
              padding: 1rem;
              border-radius: 4px;
              overflow: auto;
            }
          </style>
        </head>
        <body>
          <h1>500 Server Error</h1>
          <p>${error.message}</p>
          <p><a href="/">← Back to Home</a></p>
        </body>
      </html>
      `,
      500
    );
  }

  return c.html('<h1>500 Server Error</h1>', 500);
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

const port = parseInt(process.env.PORT || '3000', 10);

const server = app.listen({ port }, () => {
  console.log(`\n🚀 Hono + Aurelia SSR Example`);
  console.log(`📍 Server running on http://localhost:${port}`);
  console.log(`\n🔗 Try these routes:`);
  console.log(`   • http://localhost:${port}              (Home - public)`);
  console.log(`   • http://localhost:${port}/dashboard    (Dashboard - requires auth)`);
  console.log(`   • http://localhost:${port}?ws=custom    (Custom workspace)`);
  console.log(`\n🔐 To access protected routes, add auth token:`);
  console.log(`   GET /dashboard?token=demo-token\n`);
});

export default app;
