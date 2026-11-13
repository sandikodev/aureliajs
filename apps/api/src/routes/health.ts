import { Hono } from 'hono';
import { pingDb } from '../db/client.js';
import { serviceInfo } from '../lib/log.js';

export const healthRoutes = new Hono();

/**
 * `GET /health` — liveness.
 *
 * The process is alive. It deliberately does **not** touch the database: a
 * liveness probe that fails when the database is slow would make the
 * orchestrator restart a perfectly healthy process.
 */
healthRoutes.get('/health', (c) =>
  c.json({
    ok: true,
    ...serviceInfo(),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }),
);

/**
 * `GET /ready` — readiness.
 *
 * The process can serve traffic, which means the database answers. This is
 * the probe a load balancer should use.
 */
healthRoutes.get('/ready', async (c) => {
  const db = await pingDb();

  return c.json(
    {
      ok: db,
      ...serviceInfo(),
      db: db ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    },
    db ? 200 : 503,
  );
});
