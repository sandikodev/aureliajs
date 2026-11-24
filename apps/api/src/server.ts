import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from './app';
import { env } from './env';
import { log, serviceInfo } from './lib/log';

/**
 * The production entry point.
 *
 * One container serves both halves of the app: the API under `/api` and the
 * built Aurelia bundle as static files, with an SPA fallback so a deep link
 * such as `/projects` returns the SPA shell (`app.html`) instead of a 404.
 * `/` itself is served by the prerendered static landing page.
 */

const webRoot = join(process.cwd(), 'web');
const appShell = existsSync(join(webRoot, 'app.html')) ? 'app.html' : 'index.html';
const landingPage = existsSync(join(webRoot, 'landing.html')) ? 'landing.html' : null;
const hasWeb = existsSync(join(webRoot, appShell)) || landingPage !== null;

if (hasWeb) {
  app.use(
    '/assets/*',
    serveStatic({
      root: webRoot,
      onFound: (path, c) => {
        // Vite fingerprints the asset filenames, so they can be cached hard.
        c.header('cache-control', 'public, max-age=31536000, immutable');
      },
    }),
  );

  if (landingPage) {
    app.get('/', serveStatic({ root: webRoot, path: landingPage }));
  }
  app.get('*', serveStatic({ root: webRoot, path: appShell }));
}

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info('listening', {
    ...serviceInfo(),
    port: info.port,
    web: hasWeb ? webRoot : 'not bundled (API only)',
  });
});

/** Shut down cleanly so a container stop does not cut in-flight requests. */
function shutdown(signal: string): void {
  log.info('shutting down', { signal });
  server.close(() => process.exit(0));
  // Do not wait forever for a stuck connection.
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  log.error('unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  log.error('uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
