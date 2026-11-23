import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { env, isProd } from './env';
import { errorResponse } from './lib/errors';
import { requestLogger } from './middleware/request-logger';
import { tenant } from './middleware/tenant';
import { authRoutes } from './routes/auth';
import { billingRoutes, publicBillingRoutes } from './routes/billing';
import { invitesRoutes, publicInviteRoutes } from './routes/invites';
import { membersRoutes } from './routes/members';
import { healthRoutes } from './routes/health';
import { overviewRoutes } from './routes/overview';
import { projectRoutes } from './routes/projects';
import { workspaceRoutes } from './routes/workspaces';

export function createApp() {
  const app = new Hono();

  app.use(requestLogger());
  app.use(secureHeaders());
  app.use(
    bodyLimit({
      maxSize: 1024 * 1024, // 1MB payload size limit (Pillar 10)
      onError: (c) =>
        c.json(
          {
            error: {
              code: 'payload_too_large',
              message: 'Request payload exceeds maximum allowed size (1MB)',
            },
          },
          413,
        ),
    }),
  );

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
      allowHeaders: ['content-type', 'x-request-id'],
      exposeHeaders: ['x-request-id', 'retry-after'],
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
