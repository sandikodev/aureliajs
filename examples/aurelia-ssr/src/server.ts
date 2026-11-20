/**
 * Pure Framework-Agnostic HTTP Server for Aurelia 2 SSR
 *
 * Runs directly on native Bun.serve (or Node http.createServer) without Hono or Express.
 * Demonstrates:
 * - Isolated request rendering via `renderAurelia()`
 * - HTML document shell generation via `createHtmlDocument()`
 * - Client hydration payload generation via `HydrationPayload`
 */

import { renderAurelia, createHtmlDocument, type HydrationPayload } from '@aureliajs/ssr';
import { AppRoot } from './components/app-root';

export interface ServerRenderResult {
  html: string;
  status: number;
}

export async function renderAppPage(url: string = 'http://localhost:3000/'): Promise<ServerRenderResult> {
  const serverTime = new Date().toISOString();
  const initialProps = {
    title: 'Pure Aurelia 2 SSR Engine',
    serverTime,
    currentUser: {
      id: 'usr-sandiko',
      name: 'Sandikodev',
      role: 'Core Systems Architect',
      avatarUrl: '',
    },
    initialCount: 25,
  };

  // 1. Render Aurelia component tree to HTML string with hydration markers
  const appHtml = await renderAurelia({
    component: AppRoot,
    props: initialProps,
    url,
    preserveMarkers: true,
  });

  // 2. Prepare hydration payload for client-side activation
  const payload: HydrationPayload = {
    component: 'app-root',
    context: {},
    initialData: initialProps,
    timestamp: Date.now(),
  };

  // 3. Generate complete HTML5 document shell with embedded XSS-safe hydration script
  const fullDocumentHtml = createHtmlDocument(appHtml, payload, {
    title: 'Aurelia 2 Pure SSR Reference',
    cssBundle: '/style.css',
    jsBundle: '/client.js',
  });

  return {
    html: fullDocumentHtml,
    status: 200,
  };
}

// Native Bun HTTP Server entrypoint (can also run via `bun src/server.ts`)
export const server = {
  port: Number(process.env.PORT || 3005),
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Universal zero-copy static asset serving for client bundle, CSS, and public assets
    if (url.pathname !== '/') {
      const file = Bun.file(new URL(`../public${url.pathname}`, import.meta.url));
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // SSR Page route
    const { html, status } = await renderAppPage(req.url);
    return new Response(html, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  },
};

if (import.meta.main) {
  console.log(`⚡ Pure Aurelia 2 SSR Server listening on http://localhost:${server.port}`);
  Bun.serve(server);
}
