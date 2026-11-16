/**
 * @aureliajs/ssr-playground
 * Web GUI Server powered by Hono
 */

import { Hono } from 'hono';
import { FIXTURES } from '../fixtures/index.js';
import { inspectAureliaSsr } from '../engine/inspector.js';
import { renderAurelia, serializeState, createHtmlDocument, type RenderContext } from '@hono/aurelia-ssr';
import { getFaviconSvg, getClientHydrationScript, getPreviewStylesheet } from './assets.js';
import { renderDashboardHtml } from './dashboard.js';
import { loadAllExamples } from '../examples/loader.js';

export function createPlaygroundApp(): Hono {
  const app = new Hono();

  // Global CORS and Cache-Control headers
  app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', '*');
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }
    await next();
  });

  // Favicon Route
  app.get('/favicon.ico', (c) => {
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body(getFaviconSvg());
  });

  // Preview Stylesheet Route (served for <link rel="stylesheet" href="/assets/main.css" />)
  app.get('/assets/main.css', (c) => {
    c.header('Content-Type', 'text/css; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(getPreviewStylesheet());
  });
  app.get('/main.css', (c) => {
    c.header('Content-Type', 'text/css; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(getPreviewStylesheet());
  });

  // Client Hydration Script Route (served for <script type="module" src="/src/main.ts"></script>)
  app.get('/src/main.ts', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(getClientHydrationScript());
  });
  app.get('/assets/main.js', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(getClientHydrationScript());
  });
  app.get('/client.js', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(getClientHydrationScript());
  });

  // API: List fixtures
  app.get('/api/fixtures', (c) => {
    return c.json({
      fixtures: Object.keys(FIXTURES).map((id) => ({
        id,
        name: id.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      })),
    });
  });

  // API: List full multi-file examples with disk manifests
  app.get('/api/examples', (c) => {
    return c.json(loadAllExamples());
  });
  app.get('/api/examples/:id', (c) => {
    const examples = loadAllExamples();
    const ex = examples[c.req.param('id')];
    if (!ex) return c.json({ error: 'Example not found' }, 404);
    return c.json(ex);
  });

  // API: Run inspection on a fixture or payload
  app.post('/api/inspect', async (c) => {
    try {
      const body = await c.req.json<{
        fixture?: string;
        context?: Partial<RenderContext>;
        props?: Record<string, unknown>;
      }>();

      const fixtureId = body.fixture || 'counter-card';
      const component = FIXTURES[fixtureId] || FIXTURES['counter-card'];

      const context: RenderContext = {
        user: body.context?.user ?? { id: 'u_1', name: 'Sandikodev', email: 'sandiko@example.com' },
        workspace: body.context?.workspace ?? { id: 'ws_1', name: 'Aurelia Production Lab' },
        role: body.context?.role ?? 'Owner',
      };

      const report = await inspectAureliaSsr({
        component,
        componentName: fixtureId,
        props: body.props || {},
        context,
      });

      return c.json(report);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        500
      );
    }
  });

  // Iframe Preview Route: Renders complete HTML document for browser inspection
  app.get('/preview/:fixture', async (c) => {
    const fixtureId = c.req.param('fixture');
    const component = FIXTURES[fixtureId] || FIXTURES['counter-card'];

    const context = {
      user: { id: 'u_1', name: 'Sandikodev', email: 'sandiko@example.com' },
      workspace: { id: 'ws_1', name: 'Aurelia Production Lab' },
      role: 'Owner',
    };

    const html = await renderAurelia({
      component,
      context,
    });

    const payload = await serializeState(context, {}, fixtureId);
    const document = createHtmlDocument(html, payload, {
      title: `${fixtureId} — Preview`,
      cssBundle: `/assets/main.css?v=${payload.timestamp}`,
      jsBundle: `/src/main.ts?v=${payload.timestamp}`,
    });

    // In addition to external asset links, also inline the stylesheet and client script into the document
    // so the preview is 100% self-contained and bulletproof against adblockers, browser caching, or extension interference
    const enrichedDocument = document
      .replace('</head>', `    <style>\n${getPreviewStylesheet()}\n    </style>\n  </head>`)
      .replace('</body>', `    <script>\n${getClientHydrationScript()}\n    </script>\n  </body>`);

    return c.html(enrichedDocument);
  });

  // Web GUI Single Page Dashboard
  app.get('/', (c) => {
    return c.html(renderDashboardHtml(loadAllExamples()));
  });

  return app;
}
