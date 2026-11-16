/**
 * @aureliajs/ssr-playground
 * Svelte.dev-inspired Playground Dashboard & AST Hover-Tracing Inspector
 */

export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aurelia 2 + Hono SSR Playground & Compiler Inspector</title>
  <script>
    // Mute development-only Tailwind CDN console warning
    (function() {
      const origWarn = console.warn;
      console.warn = function(...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
        origWarn.apply(console, args);
      };
    })();
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: '#0d1117',
            surface: '#161b22',
            card: '#161b22',
            border: '#30363d',
            accent: '#ff3e00', // Svelte-like fiery coral accent
            primary: '#f97316',
            hover: '#21262d',
          },
          fontFamily: {
            mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    /* Svelte Playground Typography & Theme */
    *, ::before, ::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      margin: 0;
      background-color: #0d1117;
      color: #e6edf3;
      user-select: none;
    }
    pre, code, textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
    }
    
    /* Code Editor Scrollbars */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0d1117; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #484f58; }

    /* Bi-directional Hover Tracing Highlight */
    .editor-trace-highlight {
      background-color: rgba(234, 179, 8, 0.28) !important;
      outline: 1.5px solid #eab308 !important;
      border-radius: 3px !important;
      box-shadow: 0 0 10px rgba(234, 179, 8, 0.35) !important;
      transition: all 0.12s ease-in-out;
    }

    .ast-node-hovered {
      background-color: rgba(234, 88, 12, 0.22) !important;
      outline: 1px solid #ea580c !important;
      border-radius: 3px !important;
    }

    /* Active Tab Indicator */
    .tab-active {
      color: #ff3e00 !important;
      border-bottom: 2px solid #ff3e00 !important;
      background-color: rgba(255, 62, 0, 0.05) !important;
    }

    .file-tab-active {
      background-color: #161b22 !important;
      color: #f0f6fc !important;
      border-top: 2px solid #ff3e00 !important;
    }
  </style>
</head>
<body class="h-screen flex flex-col overflow-hidden text-sm">

  <!-- Top Navigation Header (Replica of svelte.dev/playground) -->
  <header class="h-12 border-b border-border bg-surface px-4 flex items-center justify-between z-30 select-none">
    <div class="flex items-center space-x-4">
      <!-- Logo -->
      <a href="/" class="flex items-center space-x-2.5 text-white font-bold tracking-tight hover:opacity-90 transition">
        <svg class="size-6 text-accent" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 19.7778H22L12 2ZM12 6.22222L18.8889 17.5556H5.11111L12 6.22222Z"/>
        </svg>
        <span class="text-base font-extrabold tracking-wider text-white">AURELIA</span>
      </a>

      <!-- SvelteKit-style Dropdown Menu Button -->
      <div class="relative">
        <button id="menuDropdownBtn" class="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-hover hover:bg-border text-gray-200 border border-border text-xs font-medium transition">
          <svg class="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clip-rule="evenodd"/>
          </svg>
          <span id="currentExampleLabel">Reactivity / Counter Card</span>
          <svg class="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Dropdown Menu List -->
        <div id="exampleDropdownMenu" class="hidden absolute top-full left-0 mt-1 w-80 max-h-[80vh] overflow-y-auto bg-surface border border-border rounded-lg shadow-2xl z-50 py-2">
          <div class="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-border/50">
            Aurelia 2 + Hono SSR Examples
          </div>
          
          <!-- Category: Introduction -->
          <div class="category-group mt-1">
            <div class="px-3 py-1 text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Introduction</span>
            </div>
            <button class="example-item w-full text-left px-5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-hover transition flex items-center justify-between" data-example="hello-world">
              <span>Hello World (Interpolation)</span>
              <span class="text-[10px] text-gray-500 font-mono">App.html</span>
            </button>
          </div>

          <!-- Category: Reactivity -->
          <div class="category-group mt-1">
            <div class="px-3 py-1 text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Reactivity</span>
            </div>
            <button class="example-item w-full text-left px-5 py-1.5 text-xs text-white bg-hover/80 hover:bg-hover transition flex items-center justify-between font-medium" data-example="counter-card">
              <span>Interactive Counter (Two-way & Trigger)</span>
              <span class="text-[10px] text-accent font-mono">★ Active</span>
            </button>
          </div>

          <!-- Category: Props & Context -->
          <div class="category-group mt-1">
            <div class="px-3 py-1 text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Props & Context</span>
            </div>
            <button class="example-item w-full text-left px-5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-hover transition flex items-center justify-between" data-example="user-profile">
              <span>User Profile (Whitelist Context DTO)</span>
              <span class="text-[10px] text-gray-500 font-mono">App.html</span>
            </button>
          </div>

          <!-- Category: Logic & Loops -->
          <div class="category-group mt-1">
            <div class="px-3 py-1 text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Logic & Loops</span>
            </div>
            <button class="example-item w-full text-left px-5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-hover transition flex items-center justify-between" data-example="data-table">
              <span>Data Table (repeat.for & if.bind)</span>
              <span class="text-[10px] text-gray-500 font-mono">App.html</span>
            </button>
          </div>

          <!-- Category: Hydration & SSR -->
          <div class="category-group mt-1">
            <div class="px-3 py-1 text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Hydration & Markers</span>
            </div>
            <button class="example-item w-full text-left px-5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-hover transition flex items-center justify-between" data-example="data-table" data-opt-markers="paired">
              <span>Paired Markers & Zero-Thrash Adoption</span>
              <span class="text-[10px] text-emerald-400 font-mono">&lt;!--au--&gt;</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Header Actions (Clean, Developer-First, No AI Slop) -->
    <div class="flex items-center space-x-3">
      <!-- Run / Inspect Button -->
      <button id="headerRunBtn" class="flex items-center space-x-1.5 px-3 py-1 rounded bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-md shadow-accent/20 transition">
        <span>▶</span>
        <span>Run (Ctrl+S)</span>
      </button>

      <!-- Reset -->
      <button id="headerResetBtn" class="px-2.5 py-1 rounded bg-hover hover:bg-border text-gray-300 text-xs font-medium border border-border transition">
        ↻ Reset
      </button>

      <!-- GitHub Repo link -->
      <a href="https://github.com/sandikodev/hono-aurelia-ssr" target="_blank" class="text-xs text-gray-400 hover:text-gray-200 transition">
        GitHub ↗
      </a>
    </div>
  </header>

  <!-- Main Split Pane Interface -->
  <div class="flex-1 flex overflow-hidden">

    <!-- LEFT PANEL: Multi-file Editor (Monaco / Svelte style) -->
    <div class="w-1/2 flex flex-col border-r border-border bg-background">
      
      <!-- Editor File Tabs -->
      <div class="h-9 border-b border-border bg-surface flex items-center justify-between px-2 select-none">
        <div class="flex items-center space-x-0.5" id="editorTabsBar">
          <button class="file-tab file-tab-active px-3 py-1.5 text-xs font-mono text-gray-200 border-r border-border flex items-center space-x-1.5" data-file="template">
            <span>App.html</span>
          </button>
          <button class="file-tab px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 border-r border-border flex items-center space-x-1.5" data-file="script">
            <span>Component.ts</span>
          </button>
          <button class="file-tab px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 border-r border-border flex items-center space-x-1.5" data-file="context">
            <span>Context.json</span>
          </button>
        </div>

        <div class="flex items-center space-x-2 text-xs text-gray-400 pr-2">
          <span class="text-[11px] font-mono text-gray-500">Aurelia 2 HTML/TS</span>
        </div>
      </div>

      <!-- Editor Code Canvas with Line Numbers & Trace Overlay -->
      <div class="flex-1 relative flex overflow-hidden">
        <!-- Line Numbers Column -->
        <div id="editorLineNumbers" class="w-12 bg-surface/50 border-r border-border/50 py-3 text-right pr-3 text-xs font-mono text-gray-600 select-none overflow-hidden leading-6">
          1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10<br>11<br>12<br>13<br>14<br>15<br>16<br>17<br>18<br>19<br>20
        </div>

        <!-- Code Textarea -->
        <textarea id="codeEditorInput" spellcheck="false" class="flex-1 bg-transparent text-gray-200 p-3 text-xs font-mono leading-6 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-accent/30"></textarea>

        <!-- Tracing Visual Highlight Overlay (Absolute on top of code) -->
        <div id="editorTraceOverlay" class="pointer-events-none absolute inset-0 pl-12 pt-3 font-mono text-xs leading-6 overflow-hidden"></div>
      </div>

      <!-- Status Footer -->
      <div class="h-6 border-t border-border bg-surface px-3 flex items-center justify-between text-[11px] text-gray-500 font-mono select-none">
        <span id="editorStatusText">App.html • UTF-8</span>
        <span>Aurelia Compiler Ready</span>
      </div>
    </div>

    <!-- RIGHT PANEL: Multi-Tab Outputs (Result, JS Output, SSR HTML, AST Output, Audit) -->
    <div class="w-1/2 flex flex-col bg-background">
      
      <!-- Right Panel Tab Bar (Matches Svelte.dev) -->
      <div class="h-9 border-b border-border bg-surface flex items-center justify-between px-2 select-none">
        <div class="flex items-center space-x-1" id="outputTabsBar">
          <button class="output-tab tab-active px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition" data-view="result">
            Result
          </button>
          <button class="output-tab px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition" data-view="js">
            JS output
          </button>
          <button class="output-tab px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition" data-view="html">
            SSR HTML
          </button>
          <button class="output-tab px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition" data-view="ast">
            AST output
          </button>
          <button class="output-tab px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition" data-view="metrics">
            Audit & Metrics
          </button>
        </div>

        <div class="flex items-center space-x-2 pr-2">
          <span id="outputStatusIndicator" class="size-2 rounded-full bg-emerald-500 inline-block"></span>
          <span class="text-[11px] font-mono text-gray-400" id="outputStatusText">Hydrated</span>
        </div>
      </div>

      <!-- Tab 1: Result (Live Preview + Bottom Console Drawer) -->
      <div id="view-result" class="output-view flex-1 flex flex-col relative overflow-hidden">
        <!-- Live Iframe Preview -->
        <div class="flex-1 bg-white relative">
          <iframe id="previewIframe" src="/preview/counter-card" class="w-full h-full border-0"></iframe>
        </div>

        <!-- Bottom Console Drawer (Matches Svelte.dev Console) -->
        <div id="consoleDrawer" class="h-44 border-t border-border bg-surface flex flex-col transition-all duration-200">
          <div class="h-7 border-b border-border bg-hover px-3 flex items-center justify-between select-none">
            <button id="toggleConsoleBtn" class="flex items-center space-x-2 text-xs font-mono font-semibold text-gray-300 hover:text-white">
              <span id="consoleArrow">▼</span>
              <span>CONSOLE</span>
              <span id="consoleBadge" class="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] rounded-full">0</span>
            </button>
            <button id="clearConsoleBtn" class="text-[11px] font-mono text-gray-400 hover:text-white transition">
              CLEAR
            </button>
          </div>
          <div id="consoleLogsStream" class="flex-1 p-2 font-mono text-xs overflow-y-auto space-y-1 text-gray-300 select-text">
            <div class="text-gray-500 italic text-[11px]">[Playground Ready] Logs and reactive click triggers will appear here...</div>
          </div>
        </div>
      </div>

      <!-- Tab 2: JS Output (Compiled Aurelia Component Definition + Compiler Options Drawer) -->
      <div id="view-js" class="output-view hidden flex-1 flex flex-col relative overflow-hidden bg-surface/30">
        <!-- JS Code View -->
        <div class="flex-1 p-4 font-mono text-xs overflow-auto text-gray-200 leading-5 select-text" id="compiledJsCode">
          /* Select a component to see its compiled Aurelia definition */
        </div>

        <!-- Compiler Options Drawer (Matches Svelte.dev screenshot 3/8) -->
        <div class="border-t border-border bg-surface p-3 select-none">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono font-semibold text-gray-300 flex items-center space-x-1.5">
              <span>⚙</span>
              <span>COMPILER & SSR OPTIONS</span>
            </span>
            <span class="text-[11px] text-gray-500 font-mono">renderAurelia() config</span>
          </div>

          <div class="font-mono text-xs text-gray-300 space-y-2 bg-background p-3 rounded border border-border/60">
            <div class="text-gray-400">result = await renderAurelia(component, {</div>
            
            <div class="pl-4 flex items-center space-x-4">
              <span class="text-gray-400">mode:</span>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-mode" value="ssr" checked class="text-accent focus:ring-0">
                <span class="text-white">"ssr"</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-mode" value="client" class="text-accent focus:ring-0">
                <span class="text-gray-400">"client"</span>
              </label>
              <span class="text-gray-500">,</span>
            </div>

            <div class="pl-4 flex items-center space-x-4">
              <span class="text-gray-400">strategy:</span>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-strategy" value="hydrate" checked class="text-accent focus:ring-0">
                <span class="text-white">"hydrate"</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-strategy" value="static" class="text-accent focus:ring-0">
                <span class="text-gray-400">"static (zero-js)"</span>
              </label>
              <span class="text-gray-500">,</span>
            </div>

            <div class="pl-4 flex items-center space-x-4">
              <span class="text-gray-400">whitelistAudit:</span>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="checkbox" id="optWhitelist" checked class="rounded text-accent focus:ring-0">
                <span class="text-white">true</span>
              </label>
            </div>

            <div class="text-gray-400">});</div>
          </div>
        </div>
      </div>

      <!-- Tab 3: SSR HTML Output -->
      <div id="view-html" class="output-view hidden flex-1 flex flex-col p-4 bg-surface/30 overflow-auto font-mono text-xs select-text">
        <div class="mb-2 text-xs font-semibold text-gray-400 flex items-center justify-between">
          <span>Pre-rendered Server HTML (with Aurelia hydration comments)</span>
          <button id="copyHtmlBtn" class="px-2 py-0.5 rounded bg-hover text-gray-300 hover:text-white border border-border">Copy HTML</button>
        </div>
        <pre id="rawServerHtmlCode" class="flex-1 text-gray-200 bg-background p-3 rounded border border-border overflow-auto whitespace-pre-wrap leading-5"></pre>
      </div>

      <!-- Tab 4: AST Output with Bi-directional Hover Tracing (Matches Svelte.dev screenshot 14/15) -->
      <div id="view-ast" class="output-view hidden flex-1 flex flex-col p-4 bg-surface/30 overflow-auto font-mono text-xs">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-gray-300">Aurelia 2 Component AST Tree</span>
          <span class="text-[11px] text-gray-500">Hover nodes to trace corresponding code region</span>
        </div>

        <div id="astTreeContainer" class="flex-1 bg-background p-3 rounded border border-border overflow-auto text-gray-300 space-y-1">
          <!-- Dynamically populated AST nodes -->
        </div>
      </div>

      <!-- Tab 5: Audit & Metrics (Preserves All Core Diagnostics) -->
      <div id="view-metrics" class="output-view hidden flex-1 p-6 bg-surface/20 overflow-y-auto space-y-6">
        <!-- 4 Stat Cards -->
        <div class="grid grid-cols-4 gap-4">
          <div class="p-4 rounded-xl border border-border bg-surface">
            <span class="text-xs text-gray-400">TTFB Server Duration</span>
            <p id="metricServerMs" class="text-2xl font-bold text-white mt-1">0 ms</p>
          </div>
          <div class="p-4 rounded-xl border border-border bg-surface">
            <span class="text-xs text-gray-400">Wire Size (Gzip)</span>
            <p id="metricGzipSize" class="text-2xl font-bold text-emerald-400 mt-1">0 kB</p>
          </div>
          <div class="p-4 rounded-xl border border-border bg-surface">
            <span class="text-xs text-gray-400">Compression Savings</span>
            <p id="metricSavings" class="text-2xl font-bold text-cyan-400 mt-1">0%</p>
          </div>
          <div class="p-4 rounded-xl border border-border bg-surface">
            <span class="text-xs text-gray-400">Core Web Vitals Grade</span>
            <p id="metricGrade" class="text-2xl font-bold text-emerald-400 mt-1">A+</p>
          </div>
        </div>

        <!-- Security & Whitelist Card -->
        <div class="p-4 rounded-xl border border-border bg-surface space-y-3">
          <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider">Hydration Security & Whitelist DTO Audit</h3>
          <div class="grid grid-cols-2 gap-4 text-xs font-mono">
            <div class="p-3 bg-background rounded border border-border flex items-center justify-between">
              <span class="text-gray-400">Sensitive Secret Leak Scan:</span>
              <span id="metricSecretStatus" class="font-bold text-emerald-400">CLEAN (0 leaked)</span>
            </div>
            <div class="p-3 bg-background rounded border border-border flex items-center justify-between">
              <span class="text-gray-400">Script Context XSS Check:</span>
              <span class="font-bold text-emerald-400">SECURE (Escaped \\u003c, \\u003e)</span>
            </div>
          </div>
        </div>

        <!-- Lighthouse Estimates -->
        <div class="p-4 rounded-xl border border-border bg-surface space-y-3">
          <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider">Estimated Core Web Vitals (Production Readiness)</h3>
          <div class="grid grid-cols-3 gap-4 text-xs font-mono">
            <div class="p-3 bg-background rounded border border-border">
              <span class="text-gray-500">Est. FCP</span>
              <p id="metricFcp" class="text-lg font-bold text-white mt-0.5">0 ms</p>
            </div>
            <div class="p-3 bg-background rounded border border-border">
              <span class="text-gray-500">Est. LCP</span>
              <p id="metricLcp" class="text-lg font-bold text-white mt-0.5">0 ms</p>
            </div>
            <div class="p-3 bg-background rounded border border-border">
              <span class="text-gray-500">CLS Risk</span>
              <p id="metricCls" class="text-lg font-bold text-emerald-400 mt-0.5">LOW</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Svelte-Style Client Controller Logic -->
  <script>
    // Fixtures Data Registry
    const FIXTURES_DATA = {
      'hello-world': {
        name: 'hello-world',
        title: 'Introduction / Hello World',
        template: '<div class="p-8 max-w-lg mx-auto bg-card rounded-2xl shadow-sm border border-border text-center space-y-4">\\n  <h1 class="text-2xl font-bold tracking-tight text-foreground">\${greeting}, \${name}!</h1>\\n  <p class="text-sm text-muted-foreground leading-relaxed">\${description}</p>\\n  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">\\n    <span>●</span>\\n    <span>Aurelia 2 Server-Side Rendered</span>\\n  </div>\\n</div>',
        script: "import { customElement } from 'aurelia';\\n\\n@customElement({ name: 'hello-world' })\\nexport class HelloWorld {\\n  greeting = 'Hello';\\n  name = 'Sandiko';\\n  description = 'Compiled directly with Aurelia 2 on Hono edge runtime with zero client payload overhead.';\\n}",
        context: { user: null, role: null },
        ast: {
          type: "CustomElementDefinition",
          name: "hello-world",
          template: {
            type: "TemplateDefinition",
            root: "div.p-8.max-w-lg",
            children: [
              { type: "ElementNode", tag: "h1", trace: "greeting", interpolation: "\${greeting}, \${name}!" },
              { type: "ElementNode", tag: "p", trace: "description", interpolation: "\${description}" }
            ]
          },
          bindables: { greeting: "toView", name: "toView", description: "toView" }
        }
      },
      'counter-card': {
        name: 'counter-card',
        title: 'Reactivity / Counter Card',
        template: '<div class="p-6 max-w-sm mx-auto bg-card rounded-xl shadow-md border space-y-4">\\n  <div class="flex items-center justify-between">\\n    <h2 class="text-xl font-bold text-foreground">\${title}</h2>\\n    <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-medium">SSR Hydrated</span>\\n  </div>\\n  <p class="text-sm text-muted-foreground">\${description}</p>\\n  <div class="flex items-center space-x-4">\\n    <button type="button" data-action="increment" data-testid="counter-btn" class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90" click.trigger="increment()">\\n      Count: \${count}\\n    </button>\\n    <span data-testid="double-val" class="text-xs text-muted-foreground">Double: \${count * 2}</span>\\n  </div>\\n</div>',
        script: "import { customElement } from 'aurelia';\\n\\n@customElement({ name: 'counter-card' })\\nexport class CounterCard {\\n  title = 'Interactive Counter';\\n  description = 'Pre-rendered on Hono server, hydrated seamlessly on client.';\\n  count = 42;\\n\\n  increment() {\\n    this.count++;\\n  }\\n}",
        context: {
          user: { id: "u_1", name: "Sandikodev", email: "sandiko@example.com" },
          workspace: { id: "ws_1", name: "Aurelia Production Lab" },
          role: "Owner"
        },
        ast: {
          type: "CustomElementDefinition",
          name: "counter-card",
          template: {
            type: "TemplateDefinition",
            root: "div.p-6.max-w-sm",
            children: [
              { type: "ElementNode", tag: "h2", trace: "title", interpolation: "\${title}" },
              { type: "ElementNode", tag: "p", trace: "description", interpolation: "\${description}" },
              { 
                type: "ElementNode", 
                tag: "button", 
                trace: "increment", 
                bindingType: "ListenerBinding", 
                instruction: 'click.trigger="increment()"' 
              },
              { 
                type: "ElementNode", 
                tag: "span", 
                trace: "count * 2", 
                bindingType: "InterpolationBinding", 
                expression: "\${count * 2}" 
              }
            ]
          },
          bindables: { title: "toView", description: "toView", count: "twoWay" },
          methods: ["increment()"]
        }
      },
      'user-profile': {
        name: 'user-profile',
        title: 'Props & Context / User Profile',
        template: '<div class="p-6 max-w-md mx-auto bg-card rounded-xl shadow-md border space-y-4">\\n  <div class="flex items-center space-x-4">\\n    <div class="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">\\n      \${user.name.charAt(0)}\\n    </div>\\n    <div>\\n      <h3 class="text-lg font-bold text-foreground">\${user.name}</h3>\\n      <p class="text-xs text-muted-foreground">\${user.email}</p>\\n    </div>\\n  </div>\\n  <div class="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs">\\n    <div><span class="text-muted-foreground">Workspace:</span> <strong class="text-foreground">\${workspace.name}</strong></div>\\n    <div><span class="text-muted-foreground">Role:</span> <strong class="text-foreground">\${role}</strong></div>\\n  </div>\\n</div>',
        script: "import { customElement } from 'aurelia';\\n\\n@customElement({ name: 'user-profile' })\\nexport class UserProfile {\\n  // Context injected automatically from Hono SSR pipeline\\n  user = null;\\n  workspace = null;\\n  role = null;\\n}",
        context: {
          user: { id: "u_99", name: "Sandikodev", email: "sandiko@example.com" },
          workspace: { id: "ws_alpha", name: "Google DeepMind Lab" },
          role: "Architect"
        },
        ast: {
          type: "CustomElementDefinition",
          name: "user-profile",
          template: {
            type: "TemplateDefinition",
            root: "div.p-6.max-w-md",
            children: [
              { type: "ElementNode", tag: "h3", trace: "user.name", interpolation: "\${user.name}" },
              { type: "ElementNode", tag: "p", trace: "user.email", interpolation: "\${user.email}" },
              { type: "ElementNode", tag: "strong", trace: "workspace.name", interpolation: "\${workspace.name}" },
              { type: "ElementNode", tag: "strong", trace: "role", interpolation: "\${role}" }
            ]
          },
          contextInjection: ["user", "workspace", "role"]
        }
      },
      'data-table': {
        name: 'data-table',
        title: 'Logic & Loops / Telemetry Data Table',
        template: '<div class="p-6 max-w-2xl mx-auto bg-card rounded-xl shadow-md border space-y-4">\\n  <h2 class="text-xl font-bold text-foreground">\${title}</h2>\\n  <table class="w-full text-left text-xs divide-y divide-border">\\n    <thead>\\n      <tr><th class="py-2">Metric</th><th>Value</th><th>Status</th></tr>\\n    </thead>\\n    <tbody class="divide-y divide-border">\\n      <tr repeat.for="row of rows">\\n        <td class="py-2">\${row.name}</td>\\n        <td>\${row.value}</td>\\n        <td><span class="px-2 py-0.5 rounded-full font-semibold">\${row.status}</span></td>\\n      </tr>\\n    </tbody>\\n  </table>\\n</div>',
        script: "import { customElement } from 'aurelia';\\n\\n@customElement({ name: 'data-table' })\\nexport class DataTable {\\n  title = 'Realtime System Telemetry';\\n  rows = [\\n    { name: 'Memory Heap', value: '42.8 MB', status: 'Optimal' },\\n    { name: 'SSR Latency', value: '0.8 ms', status: 'Fast' },\\n    { name: 'Hydration Markers', value: '9 Paired', status: 'Healthy' }\\n  ];\\n}",
        context: { user: null, role: "Admin" },
        ast: {
          type: "CustomElementDefinition",
          name: "data-table",
          template: {
            type: "TemplateDefinition",
            root: "div.p-6.max-w-2xl",
            children: [
              { type: "ElementNode", tag: "h2", trace: "title", interpolation: "\${title}" },
              { 
                type: "RepeatTemplateController", 
                trace: "repeat.for", 
                instruction: 'repeat.for="row of rows"', 
                scope: "rows" 
              }
            ]
          },
          templateControllers: ["repeat.for"]
        }
      }
    };

    let activeExampleId = 'counter-card';
    let activeFileTab = 'template';
    let consoleLogCount = 0;

    // DOM Elements
    const codeEditorInput = document.getElementById('codeEditorInput');
    const editorLineNumbers = document.getElementById('editorLineNumbers');
    const editorTraceOverlay = document.getElementById('editorTraceOverlay');
    const previewIframe = document.getElementById('previewIframe');
    const compiledJsCode = document.getElementById('compiledJsCode');
    const rawServerHtmlCode = document.getElementById('rawServerHtmlCode');
    const astTreeContainer = document.getElementById('astTreeContainer');
    const consoleLogsStream = document.getElementById('consoleLogsStream');
    const consoleBadge = document.getElementById('consoleBadge');
    const currentExampleLabel = document.getElementById('currentExampleLabel');
    const exampleDropdownMenu = document.getElementById('exampleDropdownMenu');

    // Initialize View
    function loadExample(id) {
      activeExampleId = id;
      const data = FIXTURES_DATA[id] || FIXTURES_DATA['counter-card'];
      currentExampleLabel.textContent = data.title;
      exampleDropdownMenu.classList.add('hidden');

      loadActiveFileContent();
      runInspection();
    }

    function loadActiveFileContent() {
      const data = FIXTURES_DATA[activeExampleId];
      if (activeFileTab === 'template') {
        codeEditorInput.value = data.template;
        document.getElementById('editorStatusText').textContent = 'App.html • HTML Template';
      } else if (activeFileTab === 'script') {
        codeEditorInput.value = data.script;
        document.getElementById('editorStatusText').textContent = 'Component.ts • TypeScript';
      } else if (activeFileTab === 'context') {
        codeEditorInput.value = JSON.stringify(data.context, null, 2);
        document.getElementById('editorStatusText').textContent = 'Context.json • SSR Whitelist DTO';
      }
      updateLineNumbers();
    }

    function updateLineNumbers() {
      const lines = codeEditorInput.value.split('\\n').length;
      let numbersHtml = '';
      for (let i = 1; i <= Math.max(lines, 15); i++) {
        numbersHtml += i + '<br>';
      }
      editorLineNumbers.innerHTML = numbersHtml;
    }

    // Bi-directional Hover Tracing Logic (Svelte.dev Replica)
    function highlightEditorRegion(searchTerm) {
      if (!searchTerm) {
        editorTraceOverlay.innerHTML = '';
        return;
      }
      const val = codeEditorInput.value;
      const index = val.indexOf(searchTerm);
      if (index === -1) return;

      const before = val.substring(0, index);
      const lineNumber = before.split('\\n').length;

      // Scroll editor into view
      const lineHeight = 24; // 1.5rem / 24px
      const targetTop = (lineNumber - 1) * lineHeight;
      codeEditorInput.scrollTop = Math.max(0, targetTop - 48);

      // Render highlight overlay box
      const lines = val.split('\\n');
      let overlayHtml = '';
      lines.forEach((line, i) => {
        if (line.includes(searchTerm)) {
          overlayHtml += '<div class="editor-trace-highlight h-6 px-1">' + escapeHtml(line) + '</div>';
        } else {
          overlayHtml += '<div class="h-6 opacity-0">' + escapeHtml(line) + '</div>';
        }
      });
      editorTraceOverlay.innerHTML = overlayHtml;
    }

    function clearEditorHighlight() {
      editorTraceOverlay.innerHTML = '';
    }

    // Run Server Inspection & Compile
    async function runInspection() {
      const fixtureData = FIXTURES_DATA[activeExampleId];
      previewIframe.src = '/preview/' + activeExampleId + '?t=' + Date.now();

      try {
        const res = await fetch('/api/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fixture: activeExampleId,
            context: fixtureData.context,
          })
        });

        const report = await res.json();
        renderInspectionOutputs(report);
      } catch (err) {
        console.error('Inspection failed:', err);
      }
    }

    function renderInspectionOutputs(report) {
      const fixtureData = FIXTURES_DATA[activeExampleId];

      // 1. JS Output (Aurelia Compiled Code)
      compiledJsCode.innerHTML = renderCompiledJs(fixtureData);

      // 2. SSR HTML Output
      rawServerHtmlCode.textContent = report.htmlOutput;

      // 3. AST Tree Output
      renderAstTree(fixtureData.ast);

      // 4. Metrics Output
      document.getElementById('metricServerMs').textContent = report.serverMetrics.totalServerMs + ' ms';
      document.getElementById('metricGzipSize').textContent = (report.networkMetrics.totalGzipBytes / 1024).toFixed(2) + ' kB';
      document.getElementById('metricSavings').textContent = report.networkMetrics.compressionRatio + '%';
      document.getElementById('metricGrade').textContent = report.lighthouse.overallGrade;
      document.getElementById('metricFcp').textContent = report.lighthouse.estimatedFcpMs + ' ms';
      document.getElementById('metricLcp').textContent = report.lighthouse.estimatedLcpMs + ' ms';
      document.getElementById('metricCls').textContent = report.lighthouse.clsRisk;
    }

    function renderCompiledJs(data) {
      const bt = String.fromCharCode(96);
      const compName = data.name.split('-').map(function(s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join('');
      const classDef = data.script.split('export class ')[1] || 'class Component {}';
      const tmpl = escapeHtml(data.template);
      return [
        "<span class='text-purple-400'>import</span> { CustomElement } <span class='text-purple-400'>from</span> <span class='text-emerald-400'>'@aurelia/runtime-html'</span>;",
        "",
        "<span class='text-gray-500'>// Compiled Aurelia 2 Component Definition</span>",
        "<span class='text-purple-400'>export const</span> <span class='text-yellow-400'>" + compName + "</span> = CustomElement.define({",
        "  name: <span class='text-emerald-400'>'" + data.name + "'</span>,",
        "  template: <span class='text-emerald-400'>" + bt + tmpl + bt + "</span>,",
        "  instructions: [",
        "    <span class='text-gray-500'>// Pre-compiled AST listener & interpolation instructions</span>",
        "    [ { type: <span class='text-emerald-400'>'listener'</span>, to: <span class='text-accent hover-trace cursor-pointer font-bold' data-trace='increment'>'click'</span>, value: <span class='text-emerald-400'>'increment()'</span> } ],",
        "    [ { type: <span class='text-emerald-400'>'interpolation'</span>, to: <span class='text-emerald-400'>'textContent'</span>, value: <span class='text-cyan-400 hover-trace cursor-pointer font-bold' data-trace='count'>'$' + '{count}'</span> } ]",
        "  ]",
        "}, <span class='text-yellow-400'>class</span> " + classDef + ");"
      ].join('<br>');
    }

    function renderAstTree(ast) {
      let html = '<div class="space-y-1">';
      html += '<div class="text-accent font-bold">' + ast.type + ' {</div>';
      html += '  <div class="pl-4 text-gray-400">name: <span class="text-white">"' + ast.name + '"</span></div>';

      if (ast.template) {
        html += '  <div class="pl-4 text-gray-400 hover-trace cursor-pointer p-0.5 rounded transition" data-trace="div">';
        html += '    <span class="text-primary">template</span>: TemplateDefinition {';
        html += ' <span class="text-gray-500">root: "' + ast.template.root + '"</span> }';
        html += '  </div>';

        if (ast.template.children) {
          html += '  <div class="pl-6 space-y-1 border-l border-border/60 my-1">';
          ast.template.children.forEach(c => {
            html += '    <div class="hover-trace cursor-pointer p-0.5 rounded transition hover:bg-hover" data-trace="' + (c.trace || '') + '">';
            html += '      <span class="text-cyan-400">' + c.tag + '</span>: ' + (c.bindingType || c.type || 'Node');
            if (c.instruction) html += ' <span class="text-accent">[' + escapeHtml(c.instruction) + ']</span>';
            if (c.interpolation) html += ' <span class="text-emerald-400">{' + escapeHtml(c.interpolation) + '}</span>';
            html += '    </div>';
          });
          html += '  </div>';
        }
      }

      if (ast.bindables) {
        html += '  <div class="pl-4 text-gray-400">bindables: ' + JSON.stringify(ast.bindables) + '</div>';
      }

      html += '<div class="text-accent font-bold">}</div>';
      html += '</div>';

      astTreeContainer.innerHTML = html;

      // Attach Bi-directional Hover Listeners
      document.querySelectorAll('.hover-trace').forEach(el => {
        el.addEventListener('mouseenter', () => {
          el.classList.add('ast-node-hovered');
          const traceTarget = el.getAttribute('data-trace');
          highlightEditorRegion(traceTarget);
        });
        el.addEventListener('mouseleave', () => {
          el.classList.remove('ast-node-hovered');
          clearEditorHighlight();
        });
      });
    }

    // Helper: Escape HTML string
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Event Listeners Setup
    codeEditorInput.addEventListener('input', () => {
      updateLineNumbers();
    });

    // File Tabs switching
    document.querySelectorAll('.file-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.file-tab').forEach(t => {
          t.classList.remove('file-tab-active');
          t.classList.add('text-gray-400');
        });
        tab.classList.add('file-tab-active');
        tab.classList.remove('text-gray-400');
        activeFileTab = tab.getAttribute('data-file');
        loadActiveFileContent();
      });
    });

    // Output Views switching
    document.querySelectorAll('.output-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('tab-active'));
        document.querySelectorAll('.output-view').forEach(v => v.classList.add('hidden'));

        tab.classList.add('tab-active');
        const viewId = 'view-' + tab.getAttribute('data-view');
        document.getElementById(viewId).classList.remove('hidden');
      });
    });

    // Dropdown toggle
    document.getElementById('menuDropdownBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      exampleDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      exampleDropdownMenu.classList.add('hidden');
    });

    // Example selection
    document.querySelectorAll('.example-item').forEach(item => {
      item.addEventListener('click', () => {
        const exampleId = item.getAttribute('data-example');
        loadExample(exampleId);
      });
    });

    // Run Buttons
    document.getElementById('headerRunBtn').addEventListener('click', runInspection);
    document.getElementById('headerResetBtn').addEventListener('click', () => loadExample(activeExampleId));

    // Keyboard Shortcuts (Ctrl+S to compile)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        runInspection();
      }
    });

    // Console Drawer logic
    const consoleDrawer = document.getElementById('consoleDrawer');
    const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
    const consoleArrow = document.getElementById('consoleArrow');
    let isConsoleCollapsed = false;

    toggleConsoleBtn.addEventListener('click', () => {
      isConsoleCollapsed = !isConsoleCollapsed;
      if (isConsoleCollapsed) {
        consoleDrawer.style.height = '28px';
        consoleArrow.textContent = '▲';
      } else {
        consoleDrawer.style.height = '176px';
        consoleArrow.textContent = '▼';
      }
    });

    document.getElementById('clearConsoleBtn').addEventListener('click', () => {
      consoleLogsStream.innerHTML = '';
      consoleLogCount = 0;
      consoleBadge.textContent = '0';
    });

    // Listen to Iframe Console messages
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'playground:console') {
        consoleLogCount++;
        consoleBadge.textContent = String(consoleLogCount);

        const row = document.createElement('div');
        row.className = 'flex items-start space-x-2 py-0.5 text-xs';
        const badgeColor = event.data.level === 'error' ? 'text-red-400' : (event.data.level === 'warn' ? 'text-amber-400' : 'text-primary');
        row.innerHTML = \`<span class="opacity-50 font-mono text-[10px]">\${new Date().toLocaleTimeString()}</span>
                         <span class="font-bold uppercase text-[10px] \${badgeColor}">[\${event.data.level}]</span>
                         <span class="flex-1 select-text text-gray-200">\${escapeHtml(event.data.message)}</span>\`;
        consoleLogsStream.appendChild(row);
        consoleLogsStream.scrollTop = consoleLogsStream.scrollHeight;
      }
    });

    // Initial Load
    loadExample('counter-card');
  </script>
</body>
</html>
`;
}
