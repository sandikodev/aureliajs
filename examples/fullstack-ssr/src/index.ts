/**
 * Hono + Aurelia SSR Example
 * 
 * Simplified demo showing core patterns:
 * - Server-side rendering with HTML templates
 * - Client-side hydration via window.__HYDRATION__
 * - Protected routes with auth guards
 * - API endpoints for data
 * - Error handling
 * 
 * Run with: pnpm dev
 * Open: http://localhost:3000
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HydrationContext {
  initialData?: Record<string, any>;
  user?: { id: string; name: string };
  timestamp?: number;
}

interface AppContext {
  Variables: {
    user?: { id: string; name: string };
    authenticated?: boolean;
    hydration?: HydrationContext;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA SOURCES (Mock)
// ═══════════════════════════════════════════════════════════════════════════

const posts = [
  { id: 1, title: 'Hono + Aurelia SSR', content: 'Server-rendered Aurelia apps' },
  { id: 2, title: 'Hydration Demo', content: 'No duplicate API calls!' },
  { id: 3, title: 'Production Ready', content: 'Docker-ready example' },
];

const dashboardStats = {
  totalUsers: 1042,
  activeToday: 337,
  revenue: '$12,450',
};

const activity = [
  { id: 1, action: 'User signup', time: '2 hours ago' },
  { id: 2, action: 'Payment processed', time: '4 hours ago' },
  { id: 3, action: 'Feature deployed', time: '1 day ago' },
];

// ═══════════════════════════════════════════════════════════════════════════
// APP SETUP
// ═══════════════════════════════════════════════════════════════════════════

const app = new Hono<AppContext>();

// Auth middleware
app.use(async (c, next) => {
  const token = c.req.query('token');
  
  if (token === 'demo-token') {
    c.set('user', { id: 'user-1', name: 'Demo User' });
    c.set('authenticated', true);
  }
  
  await next();
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES: PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

app.get('/', (c) => {
  const hydration: HydrationContext = {
    initialData: { posts },
    timestamp: Date.now(),
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hono + Aurelia SSR - Home</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .post { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 6px; }
    .post h3 { margin: 0 0 5px 0; }
    .post p { margin: 0; color: #666; }
    .link { color: #667eea; text-decoration: none; }
    .link:hover { text-decoration: underline; }
    .hydration-info { background: #e8f4f8; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 12px; }
    code { background: #333; color: #0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Hono + Aurelia SSR Example</h1>
    <p>This page is server-rendered! Check the hydration payload below.</p>
  </div>

  <div class="hydration-info">
    <strong>✅ Hydration Active!</strong><br>
    This page was server-rendered and includes <code>window.__HYDRATION__</code> with pre-loaded data.
    No duplicate API calls on page load!
  </div>

  <h2>📝 Posts (${posts.length})</h2>
  ${posts.map(p => `
    <div class="post">
      <h3>${p.title}</h3>
      <p>${p.content}</p>
    </div>
  `).join('')}

  <h2>🔗 Links</h2>
  <ul>
    <li><a class="link" href="/api/posts">📊 View as JSON</a></li>
    <li><a class="link" href="/dashboard?token=demo-token">🔒 Protected Dashboard</a></li>
    <li><a class="link" href="/health">💚 Health Check</a></li>
  </ul>

  <script>
    window.__HYDRATION__ = ${JSON.stringify(hydration)};
    console.log('✅ Hydration payload loaded:', window.__HYDRATION__);
  </script>
</body>
</html>`;

  return c.html(html);
});

app.get('/api/posts', (c) => {
  return c.json(posts);
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES: PROTECTED
// ═══════════════════════════════════════════════════════════════════════════

app.get('/dashboard', (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login Required</title>
        <style>
          body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f0f0; }
          .box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          h1 { margin-top: 0; }
          a { color: #667eea; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>🔐 Authentication Required</h1>
          <p>This dashboard requires authentication.</p>
          <p><a href="/?token=demo-token">← Back to Home</a></p>
          <hr>
          <p><strong>Try this URL to authenticate:</strong></p>
          <code>/dashboard?token=demo-token</code>
        </div>
      </body>
      </html>
    `, 401);
  }

  const hydration: HydrationContext = {
    initialData: { stats: dashboardStats, activity },
    user,
    timestamp: Date.now(),
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard - Protected</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
    .stat { background: #f5f5f5; padding: 20px; border-radius: 6px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { color: #666; margin-top: 5px; }
    .activity { background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 10px 0; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Dashboard</h1>
    <p>Welcome, ${user.name}! 👋</p>
    <p style="font-size: 14px; opacity: 0.9;">This is a protected route — only accessible with valid auth token.</p>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${dashboardStats.totalUsers}</div>
      <div class="stat-label">Total Users</div>
    </div>
    <div class="stat">
      <div class="stat-value">${dashboardStats.activeToday}</div>
      <div class="stat-label">Active Today</div>
    </div>
    <div class="stat">
      <div class="stat-value">${dashboardStats.revenue}</div>
      <div class="stat-label">Revenue</div>
    </div>
  </div>

  <h2>📈 Recent Activity</h2>
  ${activity.map(a => `
    <div class="activity">
      <strong>${a.action}</strong> <span style="color: #999;">${a.time}</span>
    </div>
  `).join('')}

  <h2>🔗 Links</h2>
  <ul>
    <li><a href="/">← Back to Home</a></li>
    <li><a href="/api/dashboard/stats">📊 View Stats as JSON</a></li>
    <li><a href="/api/dashboard/activity">📋 View Activity as JSON</a></li>
  </ul>

  <script>
    window.__HYDRATION__ = ${JSON.stringify(hydration)};
    console.log('✅ Dashboard hydration loaded:', window.__HYDRATION__);
  </script>
</body>
</html>`;

  return c.html(html);
});

app.get('/api/dashboard/stats', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(dashboardStats);
});

app.get('/api/dashboard/activity', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(activity);
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES: UTILITY
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.all('*', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>404 Not Found</title>
      <style>
        body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f0f0; }
        .box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #e74c3c; }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>404 Not Found</h1>
        <p>The page you requested does not exist.</p>
        <p><a href="/">← Back to Home</a></p>
      </div>
    </body>
    </html>
  `, 404);
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

const port = parseInt(process.env.PORT || '3000', 10);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`\n🚀 Hono + Aurelia SSR Example`);
  console.log(`📍 Server running on http://localhost:${info.port}`);
  console.log(`\n🔗 Try these routes:`);
  console.log(`   • http://localhost:${info.port}              (Home - public)`);
  console.log(`   • http://localhost:${info.port}/dashboard?token=demo-token  (Protected dashboard)`);
  console.log(`   • http://localhost:${info.port}/api/posts    (JSON API)`);
  console.log(`   • http://localhost:${info.port}/health       (Health check)`);
  console.log(`\n📝 Server-side rendered pages include window.__HYDRATION__ payload`);
  console.log(`   Check browser DevTools console to see hydration data\n`);
});
