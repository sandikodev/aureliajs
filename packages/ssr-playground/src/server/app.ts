/**
 * @aureliajs/ssr-playground
 * Web GUI Server powered by Hono
 */

import { Hono } from 'hono';
import { CustomElement } from 'aurelia';
import { aurelia } from '@hono/aurelia';
import { FIXTURES, CounterCard } from '../fixtures/index';
import { inspectAureliaSsr } from '../engine/inspector';
import { compilePlaygroundExample, type CompileRequest } from '../engine/compiler';
import { renderAurelia, serializeState, createHtmlDocument, type RenderContext } from '@aureliajs/ssr';
import {
  getFaviconSvg,
  getClientHydrationScript,
  getPreviewStylesheet,
  getPrismBundleScript,
  getPrismStylesheet,
} from './assets';
import { renderDashboardHtml } from './dashboard';
import { loadAllExamples } from '../examples/loader';

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

  // Prism Syntax Highlighting Assets
  app.get('/assets/prism.js', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body(getPrismBundleScript());
  });
  app.get('/assets/prism.css', (c) => {
    c.header('Content-Type', 'text/css; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body(getPrismStylesheet());
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
      const component = FIXTURES[fixtureId] ?? CounterCard;

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

  // API: Dynamic Compilation & SSR Pipeline (Live code execution)
  app.post('/api/compile', async (c) => {
    try {
      const body = await c.req.json<CompileRequest>();
      const result = await compilePlaygroundExample(body);
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  const StreamingDeferredCard = CustomElement.define(
    {
      name: 'streaming-deferred-card',
      template: `<div class="au-card" data-testid="streaming-deferred-card">
        <div class="au-card-header">
          <div>
            <h3 class="au-card-title">\${heading}</h3>
            <p class="au-card-subtitle">Shell flushed first via Web Streams; deferred payload resolves asynchronously.</p>
          </div>
          <span class="au-tag au-tag-cyan">Streaming SSR</span>
        </div>
        <div class="au-card-body">
          <div data-deferred-status="d1" data-testid="deferred-slot">Streaming from server...</div>
        </div>
      </div>`,
    },
    class StreamingDeferredCard {
      heading = 'Aurelia 2 Deferred Streaming';
    }
  );

  app.get('/assets/deferred-client.js', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(`(function () {
  function applyDeferred() {
    var scripts = document.querySelectorAll('script[type="application/json"][data-au-deferred]');
    scripts.forEach(function (el) {
      var id = el.getAttribute('data-au-deferred');
      var raw = el.textContent || '{}';
      el.remove();
      if (!id) return;
      try {
        var parsed = JSON.parse(raw);
        var target = document.querySelector('[data-deferred-status="' + id + '"]');
        if (target) {
          target.setAttribute('data-deferred-resolved', parsed.ok === false ? 'error' : 'ok');
          target.textContent = parsed.ok === false
            ? 'Deferred error: ' + (parsed.error || 'unknown')
            : 'Resolved [' + id + ']: ' + JSON.stringify(parsed.data);
        }
        window.__DEFERRED_RESOLVED__ = window.__DEFERRED_RESOLVED__ || {};
        window.__DEFERRED_RESOLVED__[id] = parsed;
      } catch (err) {
        console.error('[Playground Deferred] Failed to parse deferred chunk', id, err);
      }
    });
  }

  applyDeferred();
  var observer = new MutationObserver(function () { applyDeferred(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();`);
  });

  app.get(
    '/preview/streaming-deferred',
    aurelia({
      component: StreamingDeferredCard,
      title: 'Streaming Deferred — Preview',
      streaming: true,
      preserveMarkers: false,
      document: {
        cssBundle: '/assets/main.css',
        jsBundle: '/assets/deferred-client.js',
      },
      loader: (c) => {
        const rawDelay = Number(c.req.query('delay') ?? '40');
        const delayMs = Number.isFinite(rawDelay) && rawDelay >= 0 && rawDelay <= 2000 ? rawDelay : 40;
        return {
          heading: 'Aurelia 2 Deferred Streaming',
          telemetry: new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  region: 'ap-southeast-1',
                  status: 'resolved',
                  delayMs,
                }),
              delayMs
            )
          ),
        };
      },
    })
  );

  // Iframe Preview Route: Renders complete HTML document for browser inspection
  app.get('/preview/:fixture', async (c) => {
    const fixtureId = c.req.param('fixture');
    const examples = loadAllExamples();
    const ex = examples[fixtureId];

    if (ex) {
      const result = await compilePlaygroundExample({
        exampleId: ex.id,
        files: ex.files,
        mode: ex.options?.mode || 'ssr',
        strategy: ex.options?.strategy || 'hydrate',
      });
      if (result.success && result.htmlDocument) {
        return c.html(result.htmlDocument);
      }
    }

    const component = FIXTURES[fixtureId] ?? CounterCard;

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
    // along with the postMessage console bridge so logs forward to the parent playground UI
    const consoleBridgeScript = `
    <script>
      (function() {
        var levels = ['log', 'info', 'warn', 'error'];
        levels.forEach(function(lvl) {
          var orig = console[lvl];
          console[lvl] = function() {
            orig.apply(console, arguments);
            var args = Array.prototype.slice.call(arguments).map(function(item) {
              if (typeof item === 'object') {
                try { return JSON.stringify(item); } catch(e) { return String(item); }
              }
              return String(item);
            });
            try {
              window.parent.postMessage({
                type: 'playground:console',
                level: lvl,
                message: args.join(' ')
              }, '*');
            } catch(e) {}
          };
        });
      })();
    </script>
    `;

    const enrichedDocument = document
      .replace('<head>', `<head>\n${consoleBridgeScript}`)
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
