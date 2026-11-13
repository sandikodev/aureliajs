/**
 * Hono + Aurelia SSR Example
 * 
 * Single server monorepo showing:
 * - Server-side rendering with Aurelia components
 * - Client-side hydration
 * - Data loading patterns
 * - Auth guard integration
 * 
 * Run with: pnpm dev
 * Open: http://localhost:3000
 */

import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { aurelia, createAuthMiddleware } from '@hono/aurelia-ssr';

// Import pages
import { HomePage } from './pages/home.js';
import { DashboardPage } from './pages/dashboard.js';
import { NotFoundPage } from './pages/not-found.js';

// Create app
const app = new Hono();

// === MIDDLEWARE ===

// Static files (public/)
app.use('/public/*', serveStatic({ root: './' }));

// Auth middleware (optional user)
app.use(
  createAuthMiddleware({
    getUserFromToken: async (token) => {
      // Example: validate JWT or session token
      if (token === 'demo-token') {
        return {
          id: 'user-1',
          email: 'demo@example.com',
          name: 'Demo User',
        };
      }
      return null;
    },
    getWorkspaceFromRequest: async (c) => {
      // Example: extract workspace from subdomain or query param
      const workspace = c.req.query('ws') || 'default';
      return {
        id: `ws-${workspace}`,
        name: workspace.charAt(0).toUpperCase() + workspace.slice(1),
      };
    },
    getRoleForUser: (user, workspace) => {
      // Example: determine role based on user + workspace
      return user.id === 'user-1' ? 'admin' : 'viewer';
    },
  })
);

// === ROUTES ===

// Home page
app.get('/', aurelia({
  component: HomePage,
  title: 'Home - Hono + Aurelia SSR',
  requiresAuth: false,
  loaders: {
    posts: async (c) => {
      // Simulated data loader
      return [
        { id: 1, title: 'Getting Started with Aurelia', slug: 'getting-started' },
        { id: 2, title: 'Hono Best Practices', slug: 'hono-best-practices' },
        { id: 3, title: 'SSR with Aurelia 2', slug: 'ssr-aurelia-2' },
      ];
    },
  },
}));

// Dashboard (protected)
app.get('/dashboard', aurelia({
  component: DashboardPage,
  title: 'Dashboard - Hono + Aurelia SSR',
  requiresAuth: true,
  loaders: {
    stats: async (c) => {
      // Data loader: get dashboard statistics
      const user = c.get('user');
      return {
        title: `Welcome, ${user?.name || 'Guest'}!`,
        views: Math.floor(Math.random() * 10000),
        posts: Math.floor(Math.random() * 100),
        engagement: Math.floor(Math.random() * 95) + 5,
      };
    },
    recentActivity: async (c) => {
      // Data loader: get recent activity
      return [
        { id: 1, type: 'post', action: 'Created post', timestamp: '2 hours ago' },
        { id: 2, type: 'comment', action: 'Replied to comment', timestamp: '5 hours ago' },
        { id: 3, type: 'like', action: 'Liked a post', timestamp: '1 day ago' },
      ];
    },
  },
  fallback: 'error',
}));

// 404 fallback
app.all('*', aurelia({
  component: NotFoundPage,
  title: '404 - Not Found',
  requiresAuth: false,
}));

// === START SERVER ===

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`\n🚀 Hono + Aurelia SSR Example`);
console.log(`📍 Server running on http://localhost:${port}`);
console.log(`\n🔗 Try these routes:`);
console.log(`   • http://localhost:${port}              (Home)`);
console.log(`   • http://localhost:${port}/dashboard    (Protected - needs auth)`);
console.log(`   • http://localhost:${port}/demo-token   (Get auth token)\n`);

export default app;
