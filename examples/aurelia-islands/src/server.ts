/**
 * Pure Framework-Agnostic Zero-JS Islands Server for Aurelia 2
 *
 * Runs natively on Bun.serve without Hono or Express dependencies.
 * Demonstrates:
 * - HTML-first SSR via @aureliajs/ssr
 * - Pre-rendered island boundary with lazy hydration metadata via @aureliajs/islands/server
 * - True Zero-JS overhead above the fold: ships only ~1.28 KB island-loader.js
 * - On-demand chunk hydration (/islands/pricing-island.js) triggered by IntersectionObserver
 */

import { renderAurelia } from '@aureliajs/ssr';
import { renderIsland } from '@aureliajs/islands/server';
import { IslandsPage } from './pages/islands';
import { PricingIsland } from './components/pricing-island';

export interface IslandServerRenderResult {
  html: string;
  status: number;
}

export async function renderIslandApp(url: string = 'http://localhost:3000/'): Promise<IslandServerRenderResult> {
  // 1. Pre-render island component to HTML with selective hydration boundary (convention resolves src automatically)
  const pricingIslandHtml = await renderIsland({
    component: PricingIsland,
    props: { plan: 'Pro', seats: 5 },
    preserveMarkers: false,
  });

  // 2. Render root page with pre-rendered island embedded
  const pageBody = await renderAurelia({
    component: IslandsPage,
    props: { pricingIslandHtml },
    url,
    preserveMarkers: false,
  });

  // 3. Assemble pure HTML5 document shell with zero-JS island loader
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurelia 2 Zero-JS Islands Reference</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="ssr-root">${pageBody}</div>
  <!-- Zero-JS Selective Hydration Loader: ~1.28 KB gzipped -->
  <script type="module" src="/island-loader.js"></script>
</body>
</html>`;

  return { html, status: 200 };
}

export const server = {
  port: Number(process.env.PORT || 3006),
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // 1. Universal Zero-Copy Static Asset Serving (Bun handles MIME types & streaming natively)
    if (url.pathname !== '/') {
      const file = Bun.file(new URL(`../public${url.pathname}`, import.meta.url));
      if (await file.exists()) {
        return new Response(file);
      }
    }

    if (url.pathname === '/favicon.ico') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ed2578"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold">Au</text></svg>`;
      return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
    }

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', architecture: 'zero-js-islands', runtime: 'bun-native' });
    }

    if (url.pathname === '/' || url.pathname === '/islands') {
      const { html, status } = await renderIslandApp(req.url);
      return new Response(html, {
        status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

if (import.meta.main) {
  console.log(`\n🏝️  Native Bun Aurelia 2 Islands Server running on http://localhost:${server.port}`);
  Bun.serve(server);
}

export default server;
