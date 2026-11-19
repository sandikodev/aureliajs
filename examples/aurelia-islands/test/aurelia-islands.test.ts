import { describe, it, expect } from 'bun:test';
import { renderIslandApp, server } from '../src/server';

describe('examples/aurelia-islands integration tests', () => {
  it('pre-renders Zero-JS Islands page with selective hydration boundary', async () => {
    const { html, status } = await renderIslandApp();

    expect(status).toBe(200);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Zero-JS HTML-First Architecture');
    // Notice: Client does NOT load full Aurelia runtime above the fold
    expect(html).not.toContain('/client.js');
    expect(html).toContain('<script type="module" src="/island-loader.js"></script>');

    // Pre-rendered island markup and contract attributes
    expect(html).toContain('<pricing-island ');
    expect(html).toContain('data-au-island="visible"');
    expect(html).toContain('data-au-root-margin="200px"');
    expect(html).toContain('data-au-src="/islands/pricing.js"');
    expect(html).toContain('Pro Plan');
    expect(html).toContain('Total: $75/mo');

    // State serialized into embedded payload
    expect(html).toMatch(/<script\s+type="application\/json"\s+data-au-island-data/);
  });

  it('serves native HTTP endpoint for page and static island assets', async () => {
    // 1. Fetch root page
    const pageRes = await server.fetch(new Request('http://localhost:3006/'));
    expect(pageRes.status).toBe(200);
    expect(pageRes.headers.get('content-type')).toContain('text/html');
    const pageHtml = await pageRes.text();
    expect(pageHtml).toContain('Zero-JS Islands');

    // 2. Fetch island loader script (~1.28 KB gz)
    const loaderRes = await server.fetch(new Request('http://localhost:3006/island-loader.js'));
    expect(loaderRes.status).toBe(200);
    expect(loaderRes.headers.get('content-type')).toContain('application/javascript');
    const loaderJs = await loaderRes.text();
    expect(loaderJs).toContain('data-au-island');

    // 3. Fetch pricing island component chunk
    const islandRes = await server.fetch(new Request('http://localhost:3006/islands/pricing.js'));
    expect(islandRes.status).toBe(200);
    expect(islandRes.headers.get('content-type')).toContain('application/javascript');

    // 4. Health endpoint
    const healthRes = await server.fetch(new Request('http://localhost:3006/health'));
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as any;
    expect(healthJson.status).toBe('ok');
    expect(healthJson.architecture).toBe('zero-js-islands');
  });
});
