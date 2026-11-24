/**
 * Build-time SSR for the public landing page.
 *
 * The landing markup has no runtime data, so neither a Vercel Function nor the
 * Aurelia SPA needs to run for it. We render the real component through
 * @aureliajs/ssr once, at build time, and write `dist/landing.html`. That file:
 *
 * - contains the complete hero/features/footer HTML for crawlers and previews;
 * - keeps only the stylesheet (no framework JS), so LCP is not gated on JS;
 * - carries a ~20-line bootstrap for the two CTA buttons and the signed-in
 *   redirect, which are the only interactive behaviours the page needs.
 *
 * `vercel.json` rewrites `/` to this file. Other routes still serve app.html
 * and boot the SPA normally.
 */
import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
// Relative import: this script lives at the workspace root, while the SSR
// package is a devDependency of apps/web. `build:packages` always runs first.
import { renderAurelia } from '../packages/aurelia-ssr/dist/server.js';
import { LandingPage } from '../apps/web/src/pages/landing-page';

const root = new URL('../', import.meta.url);
const indexShellPath = new URL('apps/web/dist/index.html', root);
const appShellPath = new URL('apps/web/dist/app.html', root);
// Vite writes index.html; once prerendered we rename it so Vercel's
// `filesystem` handler cannot serve it for `/` ahead of the landing rewrite.
const shellIsIndex = existsSync(indexShellPath);
const shellPath = shellIsIndex ? indexShellPath : appShellPath;
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
if (!markup.includes('data-ssr-login')) {
  throw new Error('Landing CTAs lost their data-ssr-login hook during SSR');
}

/**
 * Runs in <head>, before first paint. The hint cookie is deliberately not
 * HttpOnly so this can happen without a network round-trip. It is only a UX
 * shortcut — API routes still authorise against the HttpOnly session cookie.
 */
const bootstrap = `<script>
  (function () {
    var signedIn = document.cookie.split('; ').some(function (c) {
      return c.indexOf('aurelia_ops_authed=1') === 0;
    });
    if (signedIn) {
      location.replace('/overview');
      return;
    }
    document.addEventListener('click', function (event) {
      var target = event.target;
      var cta = target && target.closest ? target.closest('[data-ssr-login]') : null;
      if (cta) {
        event.preventDefault();
        location.assign('/login');
      }
    });
  })();
</script>`;

const shell = await readFile(shellPath, 'utf8');
const host = '<app-root></app-root>';
if (!shell.includes(host)) {
  throw new Error(`Expected ${host} in ${shellPath.pathname.split('/dist/')[1] ?? 'app.html'}`);
}

// The SPA entry and its preloads are useless on a page that never mounts the
// app. Dropping them keeps the static landing free of framework JavaScript.
const stripped = shell
  .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
  .replace(/<link rel="modulepreload"[^>]*>\s*/g, '');
if (stripped.includes('type="module"')) {
  throw new Error('Failed to strip SPA entry script from the static landing page');
}

const landing = stripped
  .replace(
    host,
    `<app-root><main id="main-content"><div data-ssr-landing>${markup}</div></main></app-root>`,
  )
  .replace('</head>', `  ${bootstrap}\n  </head>`);

await writeFile(landingPath, landing);
console.log(
  `[prerender] ${landingPath.pathname.split('/dist/')[1] ?? 'landing.html'} (${landing.length} bytes, static)`,
);

if (shellIsIndex) {
  await rename(indexShellPath, appShellPath);
  console.log('[prerender] SPA shell renamed to app.html');
}
