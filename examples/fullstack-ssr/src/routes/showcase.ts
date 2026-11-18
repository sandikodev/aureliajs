import type { Hono } from 'hono';
import { renderIsland } from '@aureliajs/islands/server';
import { PricingIsland } from '../components/pricing-island.aux';
import { readBridgeManifest } from '../bridge/manifest.js';

export function renderSharedNavbar(active: 'islands' | 'bridge'): string {
  return `
    <nav class="navbar">
      <div class="nav-container">
        <div class="brand">
          <a href="/" class="brand-link">
            <svg class="brand-logo" width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="46" stroke="#ed2578" stroke-width="8"/>
              <circle cx="50" cy="50" r="24" fill="#ed2578"/>
            </svg>
            <span class="brand-title">Aurelia <span class="brand-accent">2</span></span>
            <span class="brand-divider">/</span>
            <span class="brand-sub">Hono SSR</span>
          </a>
        </div>
        <div class="nav-links">
          <a href="/" class="nav-item">Overview</a>
          <a href="/islands" class="nav-item ${active === 'islands' ? 'is-active' : ''}">Zero-JS Islands</a>
          <a href="/bridge" class="nav-item ${active === 'bridge' ? 'is-active' : ''}">Polyglot Bridge</a>
          <a href="/dashboard?token=demo-token" class="nav-item">Telemetry</a>
        </div>
      </div>
    </nav>
  `;
}

let htmxPulseCount = 0;

/**
 * Register showcase routes for Zero-JS Selective Hydration and Polyglot Bridge.
 * Keeps the main index.ts clean, declarative, and focused on core routing.
 */
export function registerShowcaseRoutes(app: Hono<any>): void {
  // HTMX dynamic partial endpoint
  app.get('/api/htmx/pulse', (c) => {
    htmxPulseCount += 1;
    return c.html(
      `<div data-testid="htmx-swapped"><strong>HTMX Server Swap #${htmxPulseCount}</strong> — HTML fragment rendered by Hono at ${new Date().toISOString()}</div>`
    );
  });

  // Zero-JS Selective Hydration Island Route
  app.get('/islands', async (c) => {
    const pricingIslandHtml = await renderIsland({
      component: PricingIsland,
      src: '/public/islands/pricing.js',
      props: { plan: 'Pro', seats: 5 },
      preserveMarkers: false,
    });

    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zero-JS Aurelia Islands</title>
  <link rel="stylesheet" href="/public/style.css">
  <script>window.qwikevents = ["click", "input", "change"];</script>
  <script src="/public/bridge/qwikloader.js"></script>
</head>
<body>
  ${renderSharedNavbar('islands')}
  <main class="islands-shell">
    <article class="card" style="padding: 1.75rem;">
      <h1>Zero-JS HTML-First Architecture</h1>
      <p class="muted" style="margin-top: 0.5rem;">
        Static copy ships 0 KB of client JavaScript. Only the ~1.28 KB gzipped
        <code>/public/island-loader.js</code> runs on page load — <code>/public/islands/pricing.js</code>
        is downloaded and hydrated ONLY when you scroll to the interactive island below.
      </p>
    </article>

    <section class="viewport-divider" data-testid="islands-scroll-divider">
      <h2>Scroll Down to Trigger <code>data-au-island="visible"</code></h2>
      <p class="muted">Open DevTools Network Tab before scrolling to verify 0 KB Aurelia downloaded above the fold.</p>
    </section>

    ${pricingIslandHtml}
  </main>
  <script type="module" src="/public/island-loader.js"></script>
</body>
</html>`);
  });

  // Polyglot Bridge + Orthogonal Islands Showcase Route
  app.get('/bridge', (c) => {
    const manifest = readBridgeManifest();

    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aurelia 2 Polyglot Bridge + Islands Showcase</title>
  <link rel="stylesheet" href="/public/style.css">
  <script>window.qwikevents = ['click', 'input', 'change'];</script>
  <script src="/public/bridge/qwikloader.js"></script>
</head>
<body>
  ${renderSharedNavbar('bridge')}
  <main class="bridge-shell">
    <header class="page-intro">
      <h1 class="page-title">Aurelia 2 Polyglot Bridge + Orthogonal Islands</h1>
      <p class="page-subtitle">
        Real-time reactive state synchronization across 9 independent frontend runtimes with orthogonal hydration scheduling.
      </p>
    </header>

    <div id="bridge-app-root"></div>
    <script id="bridge-manifest-data" type="application/json">${JSON.stringify(manifest).replace(/</g, '\\u003c')}</script>
  </main>
  <script type="module" src="/public/bridge/app.js"></script>
</body>
</html>`);
  });
}
