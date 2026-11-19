import { describe, it, expect } from 'bun:test';
import { renderAurelia } from '@aureliajs/ssr';
import { AppRoot } from '../src/components/app-root.js';
import { renderAppPage, server } from '../src/server.js';

describe('examples/aurelia-ssr pure integration tests', () => {
  it('renders AppRoot directly via renderAurelia() without any HTTP framework', async () => {
    const html = await renderAurelia({
      component: AppRoot,
      props: {
        title: 'Direct Engine Render',
        serverTime: '2026-11-19T00:00:00.000Z',
        initialCount: 50,
      },
      preserveMarkers: false,
    });

    expect(html).toContain('Direct Engine Render');
    expect(html).toContain('Current Count:');
    expect(html).toContain('50');
    expect(html).toContain('User Profile (Server Hydrated)');
  });

  it('generates full HTML5 document with XSS-safe hydration script via renderAppPage()', async () => {
    const result = await renderAppPage('http://localhost:3005/');
    expect(result.status).toBe(200);
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<title>Aurelia 2 Pure SSR Reference</title>');
    expect(result.html).toContain('Pure Aurelia 2 SSR Engine');
    expect(result.html).toContain('id="__AURELIA_SSR_DATA__" type="application/json"');
    expect(result.html).toContain('"component":"app-root"');
  });

  it('serves SSR response from native Bun server fetch handler', async () => {
    const req = new Request('http://localhost:3005/');
    const res = await server.fetch(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const body = await res.text();
    expect(body).toContain('Pure Framework-Agnostic SSR');
    expect(body).toContain('Sandikodev');
  });
});
