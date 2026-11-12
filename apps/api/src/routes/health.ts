import { Hono } from 'hono';
import { pingDb } from '../db/client.js';

export const healthRoutes = new Hono();

healthRoutes.get('/health', async (c) => {
  const db = await pingDb();
  return c.json({
    ok: true,
    service: 'aureliajs-api',
    db: db ? 'up' : 'down',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
