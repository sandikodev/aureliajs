import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);
const dist = new URL('apps/web/dist/', root);
const built = existsSync(new URL('landing.html', dist));

/**
 * These assertions run after `bun run build` in CI. Locally they are skipped
 * until a build has been produced, so `bun test` still works from a fresh
 * checkout.
 */
describe.skipIf(!built)('production SEO output', () => {
  const landing = readFileSync(new URL('landing.html', dist), 'utf8');
  const shellName = existsSync(new URL('app.html', dist)) ? 'app.html' : 'index.html';
  const shell = readFileSync(new URL(shellName, dist), 'utf8');

  test('landing.html contains real, server-rendered landing content', () => {
    // The app shell normally supplies <main>; the standalone static page needs
    // its own so axe/Lighthouse do not report a missing landmark.
    expect(landing).toContain('<main id="main-content">');
    expect(landing).toContain('<div data-ssr-landing>');
    expect(landing).toContain('SaaS Admin Dashboard');
    expect(landing).toContain('Team Management');
    expect(landing).toContain('Stripe Billing');
    // Framework markers are useless without a hydration pass on the static copy.
    expect(landing).not.toContain('<!--au-->');
    // Static-first: the landing page never downloads or mounts the SPA.
    expect(landing).not.toContain('type="module"');
    expect(landing).not.toContain('rel="modulepreload"');
    expect(landing).toContain('rel="stylesheet"');
    // Its two CTAs and the signed-in redirect are wired by a tiny inline script.
    expect(landing).toContain('data-ssr-login');
    expect(landing).toContain('aurelia_ops_authed=1');
  });

  test('the shell exposes canonical, Open Graph and structured data', () => {
    for (const html of [shell, landing]) {
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('name="twitter:image"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('github.com/sandikodev/aureliajs');
    }
  });

  test('robots.txt and sitemap.xml are real files, not the SPA fallback', () => {
    const ogImage = readFileSync(new URL('og-image.png', dist));
    // PNG signature and IHDR width/height (1200 x 630).
    expect([...ogImage.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(ogImage.readUInt32BE(16)).toBe(1200);
    expect(ogImage.readUInt32BE(20)).toBe(630);

    const robots = readFileSync(new URL('robots.txt', dist), 'utf8');
    const sitemap = readFileSync(new URL('sitemap.xml', dist), 'utf8');
    expect(robots).toMatch(/^User-agent: \*/);
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://aureliajs.vercel.app/sitemap.xml');
    expect(sitemap).toContain('<loc>https://aureliajs.vercel.app/</loc>');
    expect(sitemap).not.toContain('<!doctype html>');
  });

  test('lazy pages are split out of the initial bundle', () => {
    const chunks = readdirSync(fileURLToPath(new URL('assets', dist))).filter((f) =>
      f.endsWith('.js'),
    );
    for (const name of ['overview-page', 'projects-page', 'members-page', 'billing-page']) {
      expect(chunks.some((chunk) => chunk.startsWith(`${name}-`))).toBe(true);
      expect(shell).not.toContain(`modulepreload crossorigin href="/assets/${name}-`);
    }
  });
});
