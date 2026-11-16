/**
 * @aureliajs/ssr-playground
 * Static assets & preview runtime handlers (CSS, Client Script, Favicon, Prism)
 */

import fs from 'node:fs';
import path from 'node:path';

let cachedPrismBundle = '';
let cachedPrismCss = '';

export function getPrismBundleScript(): string {
  if (cachedPrismBundle) return cachedPrismBundle;
  try {
    const prismDir = path.resolve(
      typeof __dirname !== 'undefined' ? __dirname : process.cwd(),
      typeof __dirname !== 'undefined' ? '../../node_modules/prismjs' : 'packages/ssr-playground/node_modules/prismjs'
    );
    const core = fs.readFileSync(path.join(prismDir, 'prism.js'), 'utf-8');
    const ts = fs.readFileSync(path.join(prismDir, 'components/prism-typescript.min.js'), 'utf-8');
    const json = fs.readFileSync(path.join(prismDir, 'components/prism-json.min.js'), 'utf-8');

    const auxSyntax = `
      // Aurelia 2 Directives, Commands, and .aux SFC Syntax for Prism
      Prism.languages.aurelia = Prism.languages.extend('markup', {});
      Prism.languages.insertBefore('aurelia', 'tag', {
        'aurelia-interpolation': {
          pattern: /\\$\\{[\\s\\S]*?\\}/,
          inside: {
            'punctuation': /^\\$\\{|\\}$/,
            rest: Prism.languages.typescript
          }
        }
      });
      if (Prism.languages.aurelia.tag && Prism.languages.aurelia.tag.inside) {
        Prism.languages.aurelia.tag.inside['attr-name'] = {
          pattern: /^[^\\s>/=]+(?:\\.[^\\s>/=]+)?/,
          inside: {
            'punctuation': /\\./,
            'attr-command': /^(trigger|bind|capture|two-way|to-view|from-view|one-time|for|attr|class|style)$/
          }
        };
      }
      Prism.languages.aux = Prism.languages.aurelia;
    `;

    cachedPrismBundle = [core, ts, json, auxSyntax].join('\n');
    return cachedPrismBundle;
  } catch (err) {
    console.error('Failed to load Prism bundle:', err);
    return '';
  }
}

export function getPrismStylesheet(): string {
  if (cachedPrismCss) return cachedPrismCss;
  try {
    const prismDir = path.resolve(
      typeof __dirname !== 'undefined' ? __dirname : process.cwd(),
      typeof __dirname !== 'undefined' ? '../../node_modules/prismjs' : 'packages/ssr-playground/node_modules/prismjs'
    );
    const css = fs.readFileSync(path.join(prismDir, 'themes/prism-tomorrow.css'), 'utf-8');
    // Ensure dark background and clean fonts
    cachedPrismCss = css + `
      code[class*="language-"], pre[class*="language-"] {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        background: transparent !important;
        text-shadow: none !important;
      }
      .token.comment, .token.block-comment, .token.prolog, .token.doctype, .token.cdata {
        color: #8b949e !important;
        font-style: italic !important;
      }
      .token.punctuation { color: #8b949e !important; }
      .token.tag, .token.attr-name, .token.namespace, .token.deleted { color: #7ee787 !important; }
      .token.function-name { color: #d2a8ff !important; }
      .token.boolean, .token.number, .token.function { color: #ffab70 !important; }
      .token.property, .token.class-name, .token.constant, .token.symbol { color: #79c0ff !important; }
      .token.selector, .token.important, .token.atrule, .token.keyword, .token.builtin { color: #d2a8ff !important; }
      .token.string, .token.char, .token.attr-value, .token.regex, .token.variable { color: #a5d6ff !important; }
      .token.operator, .token.entity, .token.url { color: #ff7b72 !important; }
      .token.attr-command { color: #ffa657 !important; font-weight: bold !important; }
    `;
    return cachedPrismCss;
  } catch (err) {
    console.error('Failed to load Prism CSS:', err);
    return '';
  }
}

export function getFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0ea5e9"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="central" font-size="65" font-family="system-ui, sans-serif" font-weight="900" fill="#ffffff">⚡</text>
</svg>`;
}

export function getClientHydrationScript(): string {
  return `/**
 * Aurelia 2 SSR Playground — Client Hydration & Preview Runtime
 */
(function() {
  console.log('[Aurelia 2 SSR Playground] Client hydration bundle initialized.');

  function onReady() {
    const payload = window.__HYDRATION__;
    console.log('[Aurelia 2 SSR Playground] Hydration payload on window:', payload);

    // 1. Counter Card Reactivity (matches data-action, data-testid, or Count text)
    const counterButtons = document.querySelectorAll(
      'button[data-action="increment"], button[data-testid="counter-btn"], button'
    );

    counterButtons.forEach((btn) => {
      const isCounter =
        btn.getAttribute('data-action') === 'increment' ||
        btn.getAttribute('data-testid') === 'counter-btn' ||
        (btn.textContent && btn.textContent.includes('Count:'));

      if (isCounter && !btn.__hydrated) {
        btn.__hydrated = true;
        const match = btn.textContent ? btn.textContent.match(/Count:\\s*(\\d+)/) : null;
        let count = match ? parseInt(match[1], 10) : 42;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          count++;
          btn.textContent = 'Count: ' + count;
          btn.setAttribute('data-count', String(count));

          // Also update the companion double indicator
          const container = btn.parentElement || btn.closest('.flex');
          if (container) {
            const doubleEl = container.querySelector('[data-testid="double-val"]') ||
              Array.from(container.querySelectorAll('span')).find(function(s) {
                return s.textContent && s.textContent.includes('Double:');
              });
            if (doubleEl) {
              doubleEl.textContent = 'Double: ' + (count * 2);
            }
          }

          console.log('[Aurelia 2 SSR Playground] Counter clicked! Re-rendered count:', count, 'double:', count * 2);
          window.dispatchEvent(new CustomEvent('counter:updated', { detail: { count: count, double: count * 2 } }));
        });
      }
    });

    window.__SSR_HYDRATED__ = true;
    window.dispatchEvent(new CustomEvent('aurelia:hydrated', { detail: payload }));
  }

  // Run immediately for elements already in DOM, and also on DOMContentLoaded
  onReady();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  }
})();
`;
}

export function getPreviewStylesheet(): string {
  return `/* Aurelia 2 SSR Playground — Component Preview Stylesheet */
*, ::before, ::after {
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: #30363d;
}

html, body {
  margin: 0;
  padding: 1.5rem;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #f0f6fc;
  background-color: #0d1117;
  color-scheme: dark;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

#ssr-root {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Utilities used by SSR fixtures */
.max-w-sm { max-width: 24rem; }
.max-w-md { max-width: 28rem; }
.max-w-lg { max-width: 32rem; }
.max-w-2xl { max-width: 42rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.p-2 { padding: 0.5rem; }
.p-2\\.5 { padding: 0.625rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.pt-1 { padding-top: 0.25rem; }
.pt-2 { padding-top: 0.5rem; }
.pb-2 { padding-bottom: 0.5rem; }
.pb-3 { padding-bottom: 0.75rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mt-1 { margin-top: 0.25rem; }

.space-y-4 > * + * { margin-top: 1rem; }
.space-x-4 > * + * { margin-left: 1rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.space-x-3 > * + * { margin-left: 0.75rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-x-2 > * + * { margin-left: 0.5rem; }
.space-y-1 > * + * { margin-top: 0.25rem; }
.space-x-1 > * + * { margin-left: 0.25rem; }
.gap-2 { gap: 0.5rem; }

.block { display: block; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.items-center { align-items: center; }
.items-baseline { align-items: baseline; }
.justify-center { justify-content: center; text-align: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.shrink-0 { flex-shrink: 0; }
.overflow-hidden { overflow: hidden; }

.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-full { border-radius: 9999px; }

.border { border: 1px solid #30363d; }
.border-t { border-top: 1px solid #30363d; }
.border-b { border-bottom: 1px solid #30363d; }
.border-border { border-color: #30363d; }
.divide-y > * + * { border-top: 1px solid #30363d; }
.divide-border > * + * { border-color: #30363d; }

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
}

.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.uppercase { text-transform: uppercase; }
.tracking-tight { letter-spacing: -0.025em; }
.leading-relaxed { line-height: 1.625; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.w-full { width: 100%; }
.size-10 { width: 2.5rem; height: 2.5rem; }
.size-12 { width: 3rem; height: 3rem; }
.text-\\[10px\\] { font-size: 10px; line-height: 14px; }
.text-\\[11px\\] { font-size: 11px; line-height: 15px; }

/* Surface & Background Dark Tokens */
.bg-background { background-color: #0d1117; }
.bg-surface { background-color: #161b22; }
.bg-card { background-color: #161b22; }
.bg-secondary { background-color: #21262d; }
.bg-hover { background-color: #21262d; }
.hover\\:bg-hover:hover { background-color: #30363d; }

.text-foreground { color: #f0f6fc; }
.text-muted-foreground { color: #8b949e; }
.text-white { color: #ffffff; }

.bg-primary { background-color: #0284c7; }
.bg-primary\\/10 { background-color: rgba(2, 132, 199, 0.15); }
.text-primary { color: #38bdf8; }
.text-primary-foreground { color: #ffffff; }
.hover\\:bg-primary\\/90:hover { background-color: #0369a1; }

.bg-muted\\/50 { background-color: rgba(110, 118, 129, 0.1); }
.hover\\:bg-muted\\/30:hover { background-color: rgba(110, 118, 129, 0.2); }

/* Semantic Badges */
.bg-emerald-100 { background-color: rgba(16, 185, 129, 0.15); }
.text-emerald-700, .text-emerald-800 { color: #34d399; }
.bg-emerald-500\\/10 { background-color: rgba(16, 185, 129, 0.15); }
.text-emerald-400 { color: #34d399; }
.border-emerald-500\\/20 { border-color: rgba(16, 185, 129, 0.25); }

.bg-blue-100 { background-color: rgba(59, 130, 246, 0.15); }
.text-blue-800 { color: #60a5fa; }
.bg-blue-500\\/10 { background-color: rgba(59, 130, 246, 0.15); }
.text-blue-400 { color: #60a5fa; }
.border-blue-500\\/20 { border-color: rgba(59, 130, 246, 0.25); }

.text-cyan-400 { color: #22d3ee; }
.bg-cyan-100 { background-color: rgba(6, 182, 212, 0.15); }
.text-cyan-800 { color: #22d3ee; }
.bg-cyan-500\\/10 { background-color: rgba(6, 182, 212, 0.15); }
.border-cyan-500\\/20 { border-color: rgba(6, 182, 212, 0.25); }

.bg-purple-100 { background-color: rgba(168, 85, 247, 0.15); }
.text-purple-800 { color: #c084fc; }
.bg-purple-500\\/10 { background-color: rgba(168, 85, 247, 0.15); }
.text-purple-400 { color: #c084fc; }
.border-purple-500\\/20 { border-color: rgba(168, 85, 247, 0.25); }

.bg-rose-500\\/10 { background-color: rgba(244, 63, 94, 0.15); }
.text-rose-400 { color: #fb7185; }
.border-rose-500\\/20 { border-color: rgba(244, 63, 94, 0.25); }

.bg-amber-100 { background-color: rgba(245, 158, 11, 0.15); }
.text-amber-700 { color: #fbbf24; }
.bg-amber-500\\/10 { background-color: rgba(245, 158, 11, 0.15); }
.text-amber-400 { color: #fbbf24; }
.border-amber-500\\/20 { border-color: rgba(245, 158, 11, 0.25); }

/* Buttons & Interactive Elements */
button, .btn-increment {
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.15s ease-in-out;
}

.btn-increment {
  padding: 0.5rem 1rem;
  background-color: #0284c7;
  color: #ffffff;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}
.btn-increment:hover {
  background-color: #0369a1;
}

/* Dark-First Form Controls */
input[type="text"],
input[type="search"],
input[type="number"],
input[type="email"],
input[type="password"],
select,
textarea {
  width: 100%;
  background-color: #0d1117 !important;
  color: #f0f6fc !important;
  border: 1px solid #30363d !important;
  border-radius: 0.5rem !important;
  padding: 0.5rem 0.75rem !important;
  font-size: 0.8125rem !important;
  line-height: 1.25rem !important;
  outline: none !important;
  box-sizing: border-box !important;
  font-family: inherit !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input[type="text"]:focus,
input[type="search"]:focus,
select:focus,
textarea:focus {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25) !important;
}

select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238b949e' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.65rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 2.25rem !important;
  cursor: pointer;
}

select option {
  background-color: #161b22;
  color: #f0f6fc;
}

input[type="checkbox"] {
  accent-color: #0284c7;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

table {
  border-collapse: collapse;
}
`;
}
