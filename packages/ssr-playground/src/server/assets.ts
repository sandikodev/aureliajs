/**
 * @aureliajs/ssr-playground
 * Static assets & preview runtime handlers (CSS, Client Script, Favicon)
 */

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
  border-color: #e5e7eb;
}

html, body {
  margin: 0;
  padding: 1.5rem;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #111827;
  background-color: #f9fafb;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  html, body {
    background-color: #0b0f19;
    color: #f3f4f6;
  }
}

/* Utilities used by SSR fixtures */
.max-w-sm { max-width: 24rem; }
.max-w-md { max-width: 28rem; }
.max-w-2xl { max-width: 42rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.p-6 { padding: 1.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.pt-2 { padding-top: 0.5rem; }

.space-y-4 > * + * { margin-top: 1rem; }
.space-x-4 > * + * { margin-left: 1rem; }
.gap-2 { gap: 0.5rem; }

.flex { display: flex; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.overflow-hidden { overflow: hidden; }

.rounded-md { border-radius: 0.375rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-full { border-radius: 9999px; }

.border { border-width: 1px; }
.border-t { border-top-width: 1px; }
.border-border { border-color: #e5e7eb; }
.divide-y > * + * { border-top-width: 1px; }
.divide-border > * + * { border-color: #e5e7eb; }

.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.text-left { text-align: left; }
.w-full { width: 100%; }
.size-12 { width: 3rem; height: 3rem; }

/* Colors */
.bg-card { background-color: #ffffff; }
.text-foreground { color: #111827; }
.text-muted-foreground { color: #6b7280; }

.bg-primary { background-color: #0284c7; }
.bg-primary\\/10 { background-color: rgba(2, 132, 199, 0.1); }
.text-primary { color: #0284c7; }
.text-primary-foreground { color: #ffffff; }
.hover\\:bg-primary\\/90:hover { background-color: #0369a1; }

.bg-secondary { background-color: #f3f4f6; }
.text-secondary-foreground { color: #1f2937; }

.bg-muted\\/50 { background-color: #f9fafb; }
.hover\\:bg-muted\\/30:hover { background-color: #f3f4f6; }

.bg-emerald-100 { background-color: #d1fae5; }
.text-emerald-700 { color: #047857; }
.text-emerald-800 { color: #065f46; }

.bg-amber-100 { background-color: #fef3c7; }
.text-amber-700 { color: #b45309; }

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.15s ease-in-out;
}

table {
  border-collapse: collapse;
}

@media (prefers-color-scheme: dark) {
  .bg-card { background-color: #111827; }
  .text-foreground { color: #f9fafb; }
  .text-muted-foreground { color: #9ca3af; }
  .border, .border-border, .divide-border > * + * { border-color: #1f2937; }
  .bg-secondary { background-color: #1f2937; }
  .text-secondary-foreground { color: #f9fafb; }
  .bg-muted\\/50 { background-color: #1f2937; }
  .hover\\:bg-muted\\/30:hover { background-color: #374151; }
  .bg-emerald-100 { background-color: rgba(16, 185, 129, 0.2); }
  .text-emerald-700, .text-emerald-800 { color: #34d399; }
  .bg-amber-100 { background-color: rgba(245, 158, 11, 0.2); }
  .text-amber-700 { color: #fbbf24; }
}
`;
}
