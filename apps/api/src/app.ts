import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env, isProd } from './env.js';
import { errorResponse } from './lib/errors.js';
import { tenant } from './middleware/tenant.js';
import { authRoutes } from './routes/auth.js';
import { billingRoutes, publicBillingRoutes } from './routes/billing.js';
import { invitesRoutes, publicInviteRoutes } from './routes/invites.js';
import { membersRoutes } from './routes/members.js';
import { healthRoutes } from './routes/health.js';
import { overviewRoutes } from './routes/overview.js';
import { projectRoutes } from './routes/projects.js';
import { workspaceRoutes } from './routes/workspaces.js';

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
  // request without a session must be able to reach login/logout/me/invites.
  api.route('/', authRoutes);
  // The Stripe webhook and the invite acceptance are also registered before
  // the tenant middleware: neither sends our session cookie. The Stripe
  // webhook authenticates with the `stripe-signature` header, the invite
  // acceptance with the one-time token in its body.
  api.route('/', publicBillingRoutes);
  api.route('/', publicInviteRoutes);
  api.use('*', tenant());
  api.route('/', overviewRoutes);
  api.route('/', projectRoutes);
  api.route('/', invitesRoutes);
  api.route('/', membersRoutes);
  api.route('/', billingRoutes);
  api.route('/', workspaceRoutes);

  app.route('/api', api);

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Unknown endpoint' } }, 404));
  app.onError((error, c) => errorResponse(c, error));

  return app;
}

export const app = createApp();
