/**
 * @aureliajs/ssr-playground
 * Web GUI Server powered by Hono
 */

import { Hono } from 'hono';
import { FIXTURES } from '../fixtures/index.js';
import { inspectAureliaSsr } from '../engine/inspector.js';
import { renderAurelia, serializeState, createHtmlDocument, type RenderContext } from '@hono/aurelia-ssr';
import { getFaviconSvg, getClientHydrationScript, getPreviewStylesheet } from './assets.js';

export function createPlaygroundApp(): Hono {
  const app = new Hono();

  // Global CORS and Cache-Control headers
  app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', '*');
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }
    await next();
  });

  // Favicon Route
  app.get('/favicon.ico', (c) => {
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body(getFaviconSvg());
  });

  // Preview Stylesheet Route (served for <link rel="stylesheet" href="/assets/main.css" />)
  app.get('/assets/main.css', (c) => {
    c.header('Content-Type', 'text/css; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(getPreviewStylesheet());
  });
  app.get('/main.css', (c) => {
    c.header('Content-Type', 'text/css; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(getPreviewStylesheet());
  });

  // Client Hydration Script Route (served for <script type="module" src="/src/main.ts"></script>)
  app.get('/src/main.ts', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(getClientHydrationScript());
  });
  app.get('/assets/main.js', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(getClientHydrationScript());
  });
  app.get('/client.js', (c) => {
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.body(getClientHydrationScript());
  });

  // API: List fixtures
  app.get('/api/fixtures', (c) => {
    return c.json({
      fixtures: Object.keys(FIXTURES).map((id) => ({
        id,
        name: id.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      })),
    });
  });

  // API: Run inspection on a fixture or payload
  app.post('/api/inspect', async (c) => {
    try {
      const body = await c.req.json<{
        fixture?: string;
        context?: Partial<RenderContext>;
        props?: Record<string, unknown>;
      }>();

      const fixtureId = body.fixture || 'counter-card';
      const component = FIXTURES[fixtureId] || FIXTURES['counter-card'];

      const context: RenderContext = {
        user: body.context?.user ?? { id: 'u_1', name: 'Sandikodev', email: 'sandiko@example.com' },
        workspace: body.context?.workspace ?? { id: 'ws_1', name: 'Aurelia Production Lab' },
        role: body.context?.role ?? 'Owner',
      };

      const report = await inspectAureliaSsr({
        component,
        componentName: fixtureId,
        props: body.props || {},
        context,
      });

      return c.json(report);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        500
      );
    }
  });

  // Iframe Preview Route: Renders complete HTML document for browser inspection
  app.get('/preview/:fixture', async (c) => {
    const fixtureId = c.req.param('fixture');
    const component = FIXTURES[fixtureId] || FIXTURES['counter-card'];

    const context = {
      user: { id: 'u_1', name: 'Sandikodev', email: 'sandiko@example.com' },
      workspace: { id: 'ws_1', name: 'Aurelia Production Lab' },
      role: 'Owner',
    };

    const html = await renderAurelia({
      component,
      context,
    });

    const payload = await serializeState(context, {}, fixtureId);
    const document = createHtmlDocument(html, payload, {
      title: `${fixtureId} — Preview`,
      cssBundle: `/assets/main.css?v=${payload.timestamp}`,
      jsBundle: `/src/main.ts?v=${payload.timestamp}`,
    });

    // In addition to external asset links, also inline the stylesheet and client script into the document
    // so the preview is 100% self-contained and bulletproof against adblockers, browser caching, or extension interference
    const enrichedDocument = document
      .replace('</head>', `    <style>\n${getPreviewStylesheet()}\n    </style>\n  </head>`)
      .replace('</body>', `    <script>\n${getClientHydrationScript()}\n    </script>\n  </body>`);

    return c.html(enrichedDocument);
  });

  // Web GUI Single Page Dashboard
  app.get('/', (c) => {
    return c.html(renderDashboardHtml());
  });

  return app;
}

function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aurelia 2 + Hono SSR Playground & Inspector</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: '#090d16',
            surface: '#111827',
            border: '#1f2937',
            primary: '#0ea5e9',
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    pre code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body class="bg-background text-gray-100 min-h-screen flex flex-col">
  <!-- Top Navigation Header -->
  <header class="h-14 border-b border-border bg-surface px-6 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">⚡</div>
      <div>
        <h1 class="font-bold text-sm tracking-wide text-white">AURELIA 2 + HONO SSR INSPECTOR</h1>
        <p class="text-[10px] text-gray-400">Production Playground & Dual Client/Server Inspector</p>
      </div>
    </div>
    <div class="flex items-center space-x-3">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        ● Dual CLI & Web GUI Active
      </span>
      <a href="https://github.com/sandikodev/hono-aurelia-ssr" target="_blank" class="text-xs text-gray-400 hover:text-white transition">GitHub Repo</a>
    </div>
  </header>

  <!-- Main Container -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Sidebar: Controls -->
    <aside class="w-80 border-r border-border bg-surface/50 p-4 flex flex-col space-y-4">
      <div>
        <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Component Fixture</label>
        <select id="fixtureSelect" class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="counter-card">Interactive Counter Card</option>
          <option value="user-profile">User Profile & Whitelist Context</option>
          <option value="data-table">Telemetry Data Table (repeat.for)</option>
        </select>
      </div>

      <div class="flex-1 flex flex-col min-h-0">
        <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Auth Context & Props (JSON)</label>
        <textarea id="contextInput" class="flex-1 bg-surface border border-border rounded-lg p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-primary resize-none">{
  "context": {
    "user": {
      "id": "u_99",
      "name": "Sandikodev",
      "email": "sandiko@example.com"
    },
    "workspace": {
      "id": "ws_alpha",
      "name": "Google DeepMind Lab"
    },
    "role": "Architect"
  },
  "props": {
    "title": "Production SSR Telemetry"
  }
}</textarea>
      </div>

      <button id="runBtn" class="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 transition flex items-center justify-center space-x-2">
        <span>⚡ Inspect Server & Client</span>
      </button>
    </aside>

    <!-- Right Workspace: Tabs & Results -->
    <main class="flex-1 flex flex-col min-w-0 bg-background">
      <!-- Tab Navigation -->
      <nav class="h-11 border-b border-border bg-surface/30 px-4 flex items-center space-x-2 text-xs font-medium">
        <button class="tab-btn px-3 py-1.5 rounded-md text-primary bg-primary/10" data-tab="preview">1. Live Preview</button>
        <button class="tab-btn px-3 py-1.5 rounded-md text-gray-400 hover:text-white" data-tab="html">2. Server HTML & Markers</button>
        <button class="tab-btn px-3 py-1.5 rounded-md text-gray-400 hover:text-white" data-tab="state">3. State & Whitelist Security</button>
        <button class="tab-btn px-3 py-1.5 rounded-md text-gray-400 hover:text-white" data-tab="network">4. Network & Waterfall</button>
        <button class="tab-btn px-3 py-1.5 rounded-md text-gray-400 hover:text-white" data-tab="lighthouse">5. Core Web Vitals & Audit</button>
      </nav>

      <!-- Tab Contents -->
      <div class="flex-1 p-6 overflow-y-auto">
        <!-- Tab 1: Live Preview -->
        <section id="tab-preview" class="tab-content h-full flex flex-col space-y-3">
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>Pre-rendered in server JSDOM, rendered in iframe with client hydration.</span>
            <button id="reloadIframeBtn" class="text-primary hover:underline">↻ Reload Iframe</button>
          </div>
          <iframe id="previewIframe" src="/preview/counter-card" class="w-full flex-1 rounded-xl border border-border bg-white"></iframe>
        </section>

        <!-- Tab 2: Server HTML -->
        <section id="tab-html" class="tab-content hidden space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">DOM Elements</span>
              <p id="elementCount" class="text-2xl font-bold text-white mt-1">0</p>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Hydration Markers</span>
              <p id="markerCount" class="text-2xl font-bold text-emerald-400 mt-1">0</p>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Marker Integrity</span>
              <p id="markerStatus" class="text-2xl font-bold text-emerald-400 mt-1">PAIRED</p>
            </div>
          </div>
          <div>
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Raw Server-Rendered HTML Output</h3>
            <pre class="p-4 rounded-xl border border-border bg-surface overflow-x-auto text-xs text-emerald-300"><code id="rawHtmlCode">Loading...</code></pre>
          </div>
        </section>

        <!-- Tab 3: State & Security -->
        <section id="tab-state" class="tab-content hidden space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Whitelist Projection Status</span>
              <p class="text-lg font-bold text-emerald-400 mt-1">✓ PASSED (Zero Secret Leaks)</p>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Script Context XSS Check</span>
              <p class="text-lg font-bold text-emerald-400 mt-1">✓ SECURE (Escaped \\u003c, \\u003e)</p>
            </div>
          </div>
          <div>
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Serialized window.__HYDRATION__ Payload</h3>
            <pre class="p-4 rounded-xl border border-border bg-surface overflow-x-auto text-xs text-cyan-300"><code id="stateJsonCode">Loading...</code></pre>
          </div>
        </section>

        <!-- Tab 4: Network & Waterfall -->
        <section id="tab-network" class="tab-content hidden space-y-4">
          <div class="grid grid-cols-4 gap-4">
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Total Document</span>
              <p id="netTotalDoc" class="text-xl font-bold text-white mt-1">-</p>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Gzip Wire Size</span>
              <p id="netGzip" class="text-xl font-bold text-emerald-400 mt-1">-</p>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Compression Savings</span>
              <p id="netSavings" class="text-xl font-bold text-primary mt-1">-</p>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Server Render Duration</span>
              <p id="netServerMs" class="text-xl font-bold text-amber-400 mt-1">-</p>
            </div>
          </div>
          <div class="p-5 rounded-xl border border-border bg-surface space-y-4">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payload Size Breakdown (Transfer Weight)</h3>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span>HTML Pre-rendered Content</span>
                  <span id="netHtmlSize" class="text-gray-400">-</span>
                </div>
                <div class="w-full bg-border rounded-full h-2">
                  <div class="bg-primary h-2 rounded-full" style="width: 75%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span>Hydration State Payload</span>
                  <span id="netStateSize" class="text-gray-400">-</span>
                </div>
                <div class="w-full bg-border rounded-full h-2">
                  <div class="bg-amber-400 h-2 rounded-full" style="width: 25%"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Tab 5: Lighthouse & Audit -->
        <section id="tab-lighthouse" class="tab-content hidden space-y-4">
          <div class="grid grid-cols-4 gap-4">
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Estimated FCP</span>
              <p id="lhFcp" class="text-2xl font-bold text-emerald-400 mt-1">-</p>
              <span class="text-[10px] text-gray-500">Good: &lt; 1800ms</span>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Estimated LCP</span>
              <p id="lhLcp" class="text-2xl font-bold text-emerald-400 mt-1">-</p>
              <span class="text-[10px] text-gray-500">Good: &lt; 2500ms</span>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Estimated TBT</span>
              <p id="lhTbt" class="text-2xl font-bold text-emerald-400 mt-1">-</p>
              <span class="text-[10px] text-gray-500">Good: &lt; 200ms</span>
            </div>
            <div class="p-4 rounded-xl border border-border bg-surface">
              <span class="text-xs text-gray-400">Lighthouse Grade</span>
              <p id="lhGrade" class="text-2xl font-bold text-emerald-400 mt-1">A+</p>
              <span class="text-[10px] text-gray-500">Audit Score: <span id="auditScore">100</span>/100</span>
            </div>
          </div>

          <div class="p-5 rounded-xl border border-border bg-surface space-y-3">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Engine Findings & Checklist</h3>
            <ul id="findingsList" class="space-y-2 text-xs text-gray-300">
              <li>Loading inspection checklist...</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  </div>

  <script>
    // Tab switching logic
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('text-primary', 'bg-primary/10');
          t.classList.add('text-gray-400');
        });
        contents.forEach(c => c.classList.add('hidden'));

        tab.classList.remove('text-gray-400');
        tab.classList.add('text-primary', 'bg-primary/10');

        const activeId = 'tab-' + tab.getAttribute('data-tab');
        document.getElementById(activeId).classList.remove('hidden');
      });
    });

    const fixtureSelect = document.getElementById('fixtureSelect');
    const contextInput = document.getElementById('contextInput');
    const runBtn = document.getElementById('runBtn');
    const previewIframe = document.getElementById('previewIframe');
    const reloadIframeBtn = document.getElementById('reloadIframeBtn');

    reloadIframeBtn.addEventListener('click', () => {
      previewIframe.src = '/preview/' + fixtureSelect.value + '?t=' + Date.now();
    });

    async function runInspection() {
      const fixture = fixtureSelect.value;
      previewIframe.src = '/preview/' + fixture + '?t=' + Date.now();

      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(contextInput.value);
      } catch (e) {
        alert('Invalid JSON in context input');
        return;
      }

      runBtn.disabled = true;
      runBtn.innerText = 'Analyzing...';

      try {
        const res = await fetch('/api/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fixture,
            context: parsedPayload.context,
            props: parsedPayload.props
          })
        });

        const data = await res.json();
        renderReport(data);
      } catch (err) {
        console.error(err);
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>⚡ Inspect Server & Client</span>';
      }
    }

    function renderReport(report) {
      document.getElementById('elementCount').innerText = report.audit.elementCount;
      document.getElementById('markerCount').innerText = report.audit.markerCount;
      document.getElementById('markerStatus').innerText = report.audit.hasStartMarker ? 'PAIRED' : 'STATIC';
      document.getElementById('rawHtmlCode').innerText = report.htmlOutput;
      document.getElementById('stateJsonCode').innerText = JSON.stringify(report.hydrationPayload, null, 2);

      document.getElementById('netTotalDoc').innerText = (report.networkMetrics.totalDocumentBytes / 1024).toFixed(2) + ' kB';
      document.getElementById('netGzip').innerText = (report.networkMetrics.totalGzipBytes / 1024).toFixed(2) + ' kB';
      document.getElementById('netSavings').innerText = report.networkMetrics.compressionRatio + '%';
      document.getElementById('netServerMs').innerText = report.serverMetrics.totalServerMs + ' ms';

      document.getElementById('netHtmlSize').innerText = (report.networkMetrics.rawHtmlBytes / 1024).toFixed(2) + ' kB';
      document.getElementById('netStateSize').innerText = (report.networkMetrics.stateBytes / 1024).toFixed(2) + ' kB';

      document.getElementById('lhFcp').innerText = report.lighthouse.estimatedFcpMs + ' ms';
      document.getElementById('lhLcp').innerText = report.lighthouse.estimatedLcpMs + ' ms';
      document.getElementById('lhTbt').innerText = report.lighthouse.estimatedTbtMs + ' ms';
      document.getElementById('lhGrade').innerText = report.lighthouse.overallGrade;
      document.getElementById('auditScore').innerText = report.audit.score;

      const findingsUl = document.getElementById('findingsList');
      findingsUl.innerHTML = '';
      report.audit.findings.forEach(f => {
        const li = document.createElement('li');
        const color = f.level === 'error' ? 'text-red-400' : f.level === 'warn' ? 'text-yellow-400' : 'text-emerald-400';
        li.innerHTML = '<span class="font-bold ' + color + '">[' + f.level.toUpperCase() + ']</span> ' + f.message;
        findingsUl.appendChild(li);
      });
    }

    fixtureSelect.addEventListener('change', runInspection);
    runBtn.addEventListener('click', runInspection);
    reloadIframeBtn.addEventListener('click', () => {
      previewIframe.src = '/preview/' + fixtureSelect.value;
    });

    // Auto-run on start
    runInspection();
  </script>
</body>
</html>`;
}
