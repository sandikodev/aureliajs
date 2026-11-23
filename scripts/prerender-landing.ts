/**
 * Build-time SSR for the public landing page.
 *
 * The landing markup has no runtime data, so serving it from a Vercel
 * Function would add cold starts for nothing. Instead we render the real
 * Aurelia component through @aureliajs/ssr once, at build time, and write the
 * result to `dist/landing.html`. `vercel.json` rewrites `/` to that file, so
 * crawlers and link previews get complete HTML without executing JavaScript.
 *
 * The SPA still boots on `/` and replaces the static copy (main.ts removes
 * `[data-ssr-landing]` before mounting), so there is one component definition
 * for both worlds.
 */
import { readFile, writeFile } from 'node:fs/promises';
// Relative import: this script lives at the workspace root, while the SSR
// package is a devDependency of apps/web. `build:packages` always runs first.
import { renderAurelia } from '../packages/aurelia-ssr/dist/server.js';
import { LandingPage } from '../apps/web/src/pages/landing-page';

const root = new URL('../', import.meta.url);
const shellPath = new URL('apps/web/dist/index.html', root);
const landingPath = new URL('apps/web/dist/landing.html', root);

const markup = await renderAurelia({
  component: LandingPage,
  engine: 'jsdom',
  url: 'https://aureliajs.vercel.app/',
  // No client-side hydration is performed on the static copy, so the
  // framework's empty marker comments would only add noise.
  preserveMarkers: false,
});

if (!markup || !markup.includes('SaaS Admin Dashboard')) {
  throw new Error('Landing prerender produced unexpected HTML — refusing to publish it');
}

const shell = await readFile(shellPath, 'utf8');
const host = '<app-root></app-root>';
if (!shell.includes(host)) {
  throw new Error(`Expected ${host} in apps/web/dist/index.html`);
}

const landing = shell.replace(host, `<app-root><div data-ssr-landing>${markup}</div></app-root>`);

await writeFile(landingPath, landing);
console.log(
  `[prerender] ${landingPath.pathname.split('/dist/')[1] ?? 'landing.html'} (${landing.length} bytes)`,
);
