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
  const index = readFileSync(new URL('index.html', dist), 'utf8');

  test('landing.html contains real, server-rendered landing content', () => {
    expect(landing).toContain('<div data-ssr-landing>');
    expect(landing).toContain('SaaS Admin Dashboard');
    expect(landing).toContain('Team Management');
    expect(landing).toContain('Stripe Billing');
    // Framework markers are useless without a hydration pass on the static copy.
    expect(landing).not.toContain('<!--au-->');
    // Built from the same shell, so it still boots the SPA in a real browser.
    expect(landing).toContain('/assets/index-');
  });

  test('the shell exposes canonical, Open Graph and structured data', () => {
    for (const html of [index, landing]) {
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('github.com/sandikodev/aureliajs');
    }
  });

  test('robots.txt and sitemap.xml are real files, not the SPA fallback', () => {
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
      expect(index).not.toContain(`modulepreload crossorigin href="/assets/${name}-`);
    }
  });
});
