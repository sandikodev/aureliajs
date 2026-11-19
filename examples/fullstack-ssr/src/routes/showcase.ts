import type { Hono } from 'hono';
import { aurelia } from '@hono/aurelia';
import { IslandsPage } from '../pages/islands.aux';
import { BridgePage } from '../pages/bridge/index.aux';
import { MyApp } from '../my-app.js';

let htmxPulseCount = 0;

/**
 * Register showcase routes for Zero-JS Selective Hydration and Polyglot Bridge.
 * Clean, idiomatic, zero-boilerplate Aurelia 2 Single-File Component (SFC) routes.
 */
export function registerShowcaseRoutes(app: Hono<any>): void {
  // HTMX dynamic partial endpoint (hypermedia swap)
  app.get('/api/htmx/pulse', (c) => {
    htmxPulseCount += 1;
    return c.html(
      `<div data-testid="htmx-swapped"><strong>HTMX Server Swap #${htmxPulseCount}</strong> — HTML fragment rendered by Hono at ${new Date().toISOString()}</div>`
    );
  });

  // Zero-JS Selective Hydration Island Route (0 KB Aurelia above the fold, loads /island-loader.js)
  app.get(
    '/islands',
    aurelia(IslandsPage, {
      document: {
        title: 'Zero-JS Aurelia Islands',
        jsBundle: '/island-loader.js',
      },
    })
  );

  // Polyglot Bridge + Orthogonal Islands Showcase Route
  app.get(
    '/bridge',
    aurelia(BridgePage, {
      document: {
        title: 'Aurelia 2 Polyglot Bridge + Islands Showcase',
        jsBundle: '/bridge/app.js',
        head: `
          <script>window.qwikevents = ['click', 'input', 'change'];</script>
          <script src="/bridge/qwikloader.js"></script>
        `,
      },
    })
  );

  // Clean Aurelia 2 Agnostic Host Showcase (belajar/aureliajs parity proof)
  app.get(
    '/belajar',
    aurelia(MyApp, {
      document: {
        title: 'Aurelia 2 Enterprise + Agnostic Bridge',
        jsBundle: '/bridge/app.js',
        head: `
          <script>window.qwikevents = ['click', 'input', 'change'];</script>
          <script src="/bridge/qwikloader.js"></script>
        `,
      },
    })
  );
}
