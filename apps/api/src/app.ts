import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env, isProd } from './env.js';
import { errorResponse } from './lib/errors.js';
import { tenant } from './middleware/tenant.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { overviewRoutes } from './routes/overview.js';
import { projectRoutes } from './routes/projects.js';

export function createApp() {
  const app = new Hono();

  app.use(logger());
  app.use(secureHeaders());
  if (isProd) {
    app.use('*', async (c, next) => {
      await next();
      c.header('Cache-Control', 'no-store');
    });
  }
  app.use(
    '/api/*',
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      allowHeaders: ['content-type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.route('/', healthRoutes);

  const api = new Hono();
  // Auth routes are registered before the tenant middleware on purpose: a
  // request without a session must be able to reach login/logout/me.
  api.route('/', authRoutes);
  api.use('*', tenant());
  api.route('/', overviewRoutes);
  api.route('/', projectRoutes);

  app.route('/api', api);

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Unknown endpoint' } }, 404));
  app.onError((error, c) => errorResponse(c, error));

  return app;
}

export const app = createApp();
