import { app } from './app';
import { env } from './env';

const isBun = 'bun' in process.versions;

if (!isBun) {
  const { serve } = await import('@hono/node-server');
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port} (${env.NODE_ENV})`);
  });
} else {
  console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV}) via Bun`);
}

export default {
  port: env.PORT,
  fetch: app.fetch,
};
