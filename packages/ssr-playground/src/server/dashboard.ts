/**
 * @aureliajs/ssr-playground
 * Enterprise Aurelia 2 + Hono SSR & .aux Playground Dashboard
 * Compact UI/UX, Fully Resizable Split Panes, In-Editor Syntax Highlighting & Real Linter
 */

import type { ExampleMeta } from '../examples/loader.js';

export function renderDashboardHtml(examplesRegistry: Record<string, ExampleMeta> = {}): string {
  const serializedExamples = JSON.stringify(examplesRegistry);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aurelia 2 + Hono SSR & .aux Playground</title>
  <script>
    // Silence development-only Tailwind CDN console warning
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
            accent: '#ff3e00',
            primary: '#0ea5e9',
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
    
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0d1117; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #484f58; }

    /* Clean Line-level Hover Tracing */
    .editor-line-highlight {
      position: absolute;
      left: 0;
      right: 0;
      background: rgba(234, 179, 8, 0.16) !important;
      border-left: 3px solid #eab308 !important;
      pointer-events: none;
      box-shadow: inset 0 0 8px rgba(234, 179, 8, 0.12);
      transition: top 0.08s ease-out;
    }

    .gutter-line-active {
      color: #eab308 !important;
      font-weight: 700 !important;
      background: rgba(234, 179, 8, 0.15) !important;
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

    .file-tab {
      height: 32px;
      padding: 0 12px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #8b949e;
      background-color: transparent;
      border-right: 1px solid #30363d;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.12s ease;
      border-top: 2px solid transparent;
    }
    .file-tab:hover {
      color: #c9d1d9;
      background-color: #161b22;
    }
    .file-tab-active {
      background-color: #161b22 !important;
      color: #f0f6fc !important;
      border-top: 2px solid #ff3e00 !important;
      font-weight: 500 !important;
    }

    /* Resizable Dividers */
    .split-divider-h {
      width: 5px;
      background: #21262d;
      cursor: col-resize;
      transition: background 0.15s ease;
      z-index: 25;
      flex-shrink: 0;
    }
    .split-divider-h:hover, .split-divider-h.active {
      background: #ff3e00 !important;
    }

    .split-divider-v {
      height: 5px;
      background: #21262d;
      cursor: row-resize;
      transition: background 0.15s ease;
      z-index: 25;
      flex-shrink: 0;
    }
    .split-divider-v:hover, .split-divider-v.active {
      background: #ff3e00 !important;
    }

    /* Diagnostic squiggly underlines */
    .lint-error-squiggly {
      text-decoration: underline wavy #ef4444 !important;
      text-underline-offset: 3px;
    }
    .lint-warning-squiggly {
      text-decoration: underline wavy #f59e0b !important;
      text-underline-offset: 3px;
    }
  </style>
</head>
<body class="h-screen flex flex-col overflow-hidden text-xs">

  <!-- Compact Top Navigation Header (Height 40px) -->
  <header class="h-10 border-b border-border bg-surface px-3 flex items-center justify-between z-30 select-none flex-shrink-0">
    <div class="flex items-center space-x-3">
      <!-- Minimalist Logo -->
      <a href="/" class="flex items-center space-x-2 text-white font-bold tracking-tight hover:opacity-90 transition">
        <svg class="size-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 19.7778H22L12 2ZM12 6.22222L18.8889 17.5556H5.11111L12 6.22222Z"/>
        </svg>
        <span class="text-xs font-black tracking-wider text-white">AURELIA 2</span>
      </a>

      <!-- Category & Example Accordion Dropdown Selector -->
      <div class="relative">
        <button id="menuDropdownBtn" class="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-hover hover:bg-border text-gray-200 border border-border text-[11px] font-medium transition">
          <svg class="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clip-rule="evenodd"/>
          </svg>
          <span id="currentExampleLabel">Loading Examples...</span>
          <svg class="size-2.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Dropdown Menu List -->
        <div id="exampleDropdownMenu" class="hidden absolute top-full left-0 mt-1 w-72 max-h-[80vh] overflow-y-auto bg-[#161b22] border border-border rounded-lg shadow-2xl z-50 py-1">
          <div id="dropdownExamplesList" class="py-0.5">
            <!-- Populated dynamically with accordion categories -->
          </div>
        </div>
      </div>
    </div>

    <!-- Right Header Actions (Compact) -->
    <div class="flex items-center space-x-2">
      <button id="headerRunBtn" class="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-accent hover:bg-accent/90 text-white text-[11px] font-semibold shadow transition">
        <span>▶</span>
        <span>Run (Ctrl+S)</span>
      </button>

      <button id="headerResetBtn" class="px-2 py-1 rounded bg-hover hover:bg-border text-gray-300 text-[11px] font-medium border border-border transition">
        ↻ Reset
      </button>

      <a href="https://github.com/sandikodev/hono-aurelia-ssr" target="_blank" class="text-[11px] text-gray-400 hover:text-gray-200 transition pl-1">
        GitHub ↗
      </a>
    </div>
  </header>

  <!-- Main Split Pane Interface (Fully Resizable) -->
  <div id="mainContainer" class="flex-1 flex overflow-hidden relative">

    <!-- LEFT PANEL: Dynamic Multi-File Editor -->
    <div id="leftEditorPane" class="w-1/2 flex flex-col bg-background overflow-hidden min-w-[200px]">
      
      <!-- Dynamic File Tabs Bar (Height 32px) -->
      <div class="h-8 border-b border-border bg-surface flex items-center justify-between px-0 select-none flex-shrink-0">
        <div class="flex items-center space-x-0" id="editorTabsBar">
          <!-- Dynamically populated files for the active example -->
        </div>

        <div class="flex items-center space-x-2 text-[11px] text-gray-400 pr-2">
          <span class="font-mono text-gray-500" id="componentModelBadge">Aurelia 2 Convention</span>
        </div>
      </div>

      <!-- Editor Canvas: Line Numbers, Syntax Highlight Layer, and Transparent Textarea -->
      <div class="flex-1 relative flex overflow-hidden" id="editorCanvasWrapper">
        <!-- Line Numbers Column -->
        <div id="editorLineNumbers" class="w-11 bg-surface/40 border-r border-border/40 py-2 text-right pr-2 font-mono text-[11px] text-gray-600 select-none overflow-hidden leading-[22px] flex-shrink-0">
          1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10
        </div>

        <!-- Clean Line Highlight Overlay -->
        <div id="editorTraceOverlay" class="pointer-events-none absolute inset-0 pl-11 overflow-hidden z-10">
          <div id="traceHighlightBar" class="hidden editor-line-highlight"></div>
        </div>

        <!-- Syntax Highlighting Background Layer (Pixel-perfect aligned with Textarea) -->
        <pre id="editorHighlightPre" class="pointer-events-none absolute inset-0 pl-11 p-2 font-mono text-xs leading-[22px] overflow-hidden whitespace-pre bg-transparent text-gray-200 z-0 m-0"><code id="editorHighlightCode"></code></pre>

        <!-- Interactive Textarea Layer (Transparent text, visible caret) -->
        <textarea id="codeEditorInput" spellcheck="false" class="absolute inset-0 pl-11 p-2 font-mono text-xs leading-[22px] resize-none focus:outline-none overflow-auto whitespace-pre bg-transparent text-transparent caret-white selection:bg-accent/30 z-20"></textarea>
      </div>

      <!-- Compact Status Footer (Height 24px) -->
      <div class="h-6 border-t border-border bg-surface px-2.5 flex items-center justify-between text-[10px] text-gray-500 font-mono select-none flex-shrink-0">
        <div class="flex items-center space-x-3">
          <span id="editorStatusText">File • UTF-8</span>
          <button id="linterStatusPill" class="flex items-center space-x-1 text-emerald-400 hover:underline">
            <span id="linterStatusIcon">✔</span>
            <span id="linterStatusText">0 errors, 0 warnings</span>
          </button>
        </div>
        <span id="editorLiveIndicator" class="text-emerald-400">● Live Synchronized</span>
      </div>
    </div>

    <!-- RESIZABLE SPLIT DIVIDER (Horizontal: Left vs Right) -->
    <div id="hSplitDivider" class="split-divider-h" title="Drag to resize panes"></div>

    <!-- RIGHT PANEL: Multi-Tab Outputs & Resizable Console -->
    <div id="rightOutputPane" class="flex-1 flex flex-col bg-background overflow-hidden min-w-[200px]">
      
      <!-- Right Panel Tab Bar (Height 32px) -->
      <div class="h-8 border-b border-border bg-surface flex items-center justify-between px-2 select-none flex-shrink-0">
        <div class="flex items-center space-x-1" id="outputTabsBar">
          <button class="output-tab tab-active px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white transition" data-view="result">
            Result
          </button>
          <button class="output-tab px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white transition" data-view="js">
            JS output
          </button>
          <button class="output-tab px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white transition" data-view="html">
            SSR HTML
          </button>
          <button class="output-tab px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white transition" data-view="ast">
            AST output
          </button>
          <button class="output-tab px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white transition" data-view="metrics">
            Audit & Metrics
          </button>
        </div>

        <div class="flex items-center space-x-1.5 pr-1">
          <span id="outputStatusIndicator" class="size-2 rounded-full bg-emerald-500 inline-block"></span>
          <span class="text-[10px] font-mono text-gray-400" id="outputStatusText">Hydrated</span>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 flex flex-col overflow-hidden relative">

        <!-- Tab 1: Result (Live Preview) -->
        <div id="view-result" class="output-view flex-1 flex flex-col relative overflow-hidden bg-white">
          <iframe id="previewIframe" class="w-full h-full border-0"></iframe>
        </div>

        <!-- Tab 2: JS Output -->
        <div id="view-js" class="output-view hidden flex-1 flex flex-col relative overflow-hidden bg-surface/30">
          <pre class="flex-1 p-3 font-mono text-[11px] overflow-auto text-gray-200 leading-5 select-text whitespace-pre-wrap m-0" id="compiledJsCode">/* Select a component to see its compiled code */</pre>

          <!-- Compiler & SSR Options (Svelte Playground Style) -->
          <div class="border-t border-border bg-surface p-2.5 select-none flex-shrink-0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-mono font-semibold text-gray-300 flex items-center space-x-1.5">
                <span>⚙</span>
                <span>COMPILER & SSR OPTIONS</span>
              </span>
              <span class="text-[10px] text-gray-500 font-mono">renderAurelia() config</span>
            </div>

            <div class="font-mono text-[11px] text-gray-300 space-y-1.5 bg-background p-2.5 rounded border border-border/60">
              <div class="text-gray-400 text-[10px]">result = await renderAurelia(component, {</div>
              
              <div class="pl-4 flex items-center space-x-6">
                <span class="text-gray-400">mode:</span>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="opt-runtime-mode" value="ssr" checked class="text-accent focus:ring-0">
                  <span class="text-emerald-400 font-semibold">"ssr"</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="opt-runtime-mode" value="client" class="text-accent focus:ring-0">
                  <span class="text-gray-400">"client"</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="opt-runtime-mode" value="resumable" class="text-accent focus:ring-0">
                  <span class="text-purple-400">"resumable"</span>
                </label>
              </div>

              <div class="pl-4 flex items-center space-x-6">
                <span class="text-gray-400">strategy:</span>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="opt-strategy" value="hydrate" checked class="text-accent focus:ring-0">
                  <span class="text-white">"hydrate"</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="opt-strategy" value="static" class="text-accent focus:ring-0">
                  <span class="text-gray-400">"static (zero-js)"</span>
                </label>
              </div>

              <div class="pl-4 flex items-center space-x-6">
                <span class="text-gray-400">whitelistAudit:</span>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="checkbox" id="opt-whitelist-audit" checked class="text-accent focus:ring-0 rounded">
                  <span class="text-cyan-400">true</span>
                </label>
              </div>

              <div class="text-gray-400 text-[10px]">});</div>
            </div>
          </div>
        </div>

        <!-- Tab 3: SSR HTML Output -->
        <div id="view-html" class="output-view hidden flex-1 flex flex-col p-3 bg-surface/30 overflow-auto font-mono text-xs select-text">
          <div class="mb-2 text-xs font-semibold text-gray-400 flex items-center justify-between">
            <span>Pre-rendered Server HTML (with Aurelia hydration markers)</span>
            <button id="copyHtmlBtn" class="px-2 py-0.5 rounded bg-hover text-gray-300 hover:text-white border border-border">Copy HTML</button>
          </div>
          <pre id="rawServerHtmlCode" class="flex-1 text-gray-200 bg-background p-3 rounded border border-border overflow-auto whitespace-pre-wrap leading-5 m-0"></pre>
        </div>

        <!-- Tab 4: AST Output with Clean Line Tracing -->
        <div id="view-ast" class="output-view hidden flex-1 flex flex-col p-3 bg-surface/30 overflow-auto font-mono text-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-300">Aurelia 2 Component AST Tree</span>
            <span class="text-[11px] text-gray-500">Hover nodes to trace corresponding code region</span>
          </div>

          <div id="astTreeContainer" class="flex-1 bg-background p-3 rounded border border-border overflow-auto text-gray-300 space-y-1">
            <!-- Dynamically populated AST nodes -->
          </div>
        </div>

        <!-- Tab 5: Audit & Metrics -->
        <div id="view-metrics" class="output-view hidden flex-1 p-4 bg-surface/20 overflow-y-auto space-y-4">
          <div class="grid grid-cols-4 gap-3">
            <div class="p-3 rounded-lg border border-border bg-surface">
              <span class="text-[11px] text-gray-400">TTFB Server Duration</span>
              <p id="metricServerMs" class="text-xl font-bold text-white mt-0.5">0 ms</p>
            </div>
            <div class="p-3 rounded-lg border border-border bg-surface">
              <span class="text-[11px] text-gray-400">Wire Size (Gzip)</span>
              <p id="metricGzipSize" class="text-xl font-bold text-emerald-400 mt-0.5">0 kB</p>
            </div>
            <div class="p-3 rounded-lg border border-border bg-surface">
              <span class="text-[11px] text-gray-400">Compression Savings</span>
              <p id="metricSavings" class="text-xl font-bold text-cyan-400 mt-0.5">0%</p>
            </div>
            <div class="p-3 rounded-lg border border-border bg-surface">
              <span class="text-[11px] text-gray-400">Core Web Vitals</span>
              <p id="metricGrade" class="text-xl font-bold text-emerald-400 mt-0.5">A+</p>
            </div>
          </div>

          <div class="p-3 rounded-lg border border-border bg-surface space-y-2">
            <h3 class="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Hydration Security & Whitelist DTO Audit</h3>
            <div class="grid grid-cols-2 gap-3 text-xs font-mono">
              <div class="p-2.5 bg-background rounded border border-border flex items-center justify-between">
                <span class="text-gray-400">Sensitive Secret Leak Scan:</span>
                <span id="metricSecretStatus" class="font-bold text-emerald-400">CLEAN (0 leaked)</span>
              </div>
              <div class="p-2.5 bg-background rounded border border-border flex items-center justify-between">
                <span class="text-gray-400">Script Context XSS Check:</span>
                <span id="metricXssStatus" class="font-bold text-emerald-400">SECURE (Escaped \\u003c, \\u003e)</span>
              </div>
            </div>
          </div>

          <div class="p-3 rounded-lg border border-border bg-surface space-y-2">
            <h3 class="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Estimated Core Web Vitals (Production Readiness)</h3>
            <div class="grid grid-cols-3 gap-3 text-xs font-mono">
              <div class="p-2.5 bg-background rounded border border-border">
                <span class="text-gray-500">Est. FCP</span>
                <p id="metricFcp" class="text-base font-bold text-white mt-0.5">0 ms</p>
              </div>
              <div class="p-2.5 bg-background rounded border border-border">
                <span class="text-gray-500">Est. LCP</span>
                <p id="metricLcp" class="text-base font-bold text-white mt-0.5">0 ms</p>
              </div>
              <div class="p-2.5 bg-background rounded border border-border">
                <span class="text-gray-500">CLS Risk</span>
                <p id="metricCls" class="text-base font-bold text-emerald-400 mt-0.5">LOW</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- RESIZABLE SPLIT DIVIDER (Vertical: Content vs Console Drawer) -->
      <div id="vSplitDivider" class="split-divider-v" title="Drag to resize console drawer"></div>

      <!-- Compact Resizable Console Drawer -->
      <div id="consoleDrawer" class="h-36 border-t border-border bg-surface flex flex-col flex-shrink-0">
        <div class="h-7 border-b border-border bg-hover px-2.5 flex items-center justify-between select-none">
          <button id="toggleConsoleBtn" class="flex items-center space-x-2 text-[11px] font-mono font-semibold text-gray-300 hover:text-white">
            <span id="consoleArrow">▼</span>
            <span>CONSOLE</span>
            <span id="consoleBadge" class="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] rounded-full">0</span>
          </button>
          <button id="clearConsoleBtn" class="text-[10px] font-mono text-gray-400 hover:text-white transition">
            CLEAR
          </button>
        </div>
        <div id="consoleLogsStream" class="flex-1 p-2 font-mono text-[11px] overflow-y-auto space-y-0.5 text-gray-300 select-text">
          <div class="text-gray-500 italic text-[10px]">[Playground Ready] Event triggers, diagnostics, and console.log appear here...</div>
        </div>
      </div>

    </div>
  </div>

  <!-- Real Examples Manifest JSON -->
  <script type="application/json" id="__EXAMPLES_DATA__">${serializedExamples.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')}</script>

  <!-- Client-side Logic -->
  <script>
    let EXAMPLES = JSON.parse(document.getElementById('__EXAMPLES_DATA__').textContent || '{}');
    const ORIGINAL_EXAMPLES = JSON.parse(JSON.stringify(EXAMPLES));
    let activeExampleId = 'counter-card';
    let activeFileName = '';
    let activeHighlightedLine = 0;
    let consoleLogCount = 0;
    let liveUpdateTimer = null;
    let currentDiagnostics = [];

    // DOM Elements
    const codeEditorInput = document.getElementById('codeEditorInput');
    const editorHighlightCode = document.getElementById('editorHighlightCode');
    const editorHighlightPre = document.getElementById('editorHighlightPre');
    const editorLineNumbers = document.getElementById('editorLineNumbers');
    const traceHighlightBar = document.getElementById('traceHighlightBar');
    const editorTabsBar = document.getElementById('editorTabsBar');
    const previewIframe = document.getElementById('previewIframe');
    const compiledJsCode = document.getElementById('compiledJsCode');
    const rawServerHtmlCode = document.getElementById('rawServerHtmlCode');
    const astTreeContainer = document.getElementById('astTreeContainer');
    const consoleLogsStream = document.getElementById('consoleLogsStream');
    const consoleBadge = document.getElementById('consoleBadge');
    const currentExampleLabel = document.getElementById('currentExampleLabel');
    const exampleDropdownMenu = document.getElementById('exampleDropdownMenu');
    const dropdownExamplesList = document.getElementById('dropdownExamplesList');
    const componentModelBadge = document.getElementById('componentModelBadge');
    const editorLiveIndicator = document.getElementById('editorLiveIndicator');
    const optWhitelistAudit = document.getElementById('opt-whitelist-audit');
    const linterStatusIcon = document.getElementById('linterStatusIcon');
    const linterStatusText = document.getElementById('linterStatusText');

    // Panes & Splitters
    const mainContainer = document.getElementById('mainContainer');
    const leftEditorPane = document.getElementById('leftEditorPane');
    const rightOutputPane = document.getElementById('rightOutputPane');
    const hSplitDivider = document.getElementById('hSplitDivider');
    const vSplitDivider = document.getElementById('vSplitDivider');
    const consoleDrawer = document.getElementById('consoleDrawer');

    // ----------------------------------------------------
    // RESIZABLE SPLIT PANES LOGIC (Horizontal & Vertical)
    // ----------------------------------------------------
    let isDraggingH = false;
    let isDraggingV = false;

    hSplitDivider.addEventListener('mousedown', (e) => {
      isDraggingH = true;
      hSplitDivider.classList.add('active');
      previewIframe.style.pointerEvents = 'none';
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    vSplitDivider.addEventListener('mousedown', (e) => {
      isDraggingV = true;
      vSplitDivider.classList.add('active');
      previewIframe.style.pointerEvents = 'none';
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingH) {
        const containerRect = mainContainer.getBoundingClientRect();
        const offsetX = e.clientX - containerRect.left;
        const totalWidth = containerRect.width;
        let percentage = (offsetX / totalWidth) * 100;
        percentage = Math.max(20, Math.min(80, percentage));
        leftEditorPane.style.width = percentage + '%';
        rightOutputPane.style.width = (100 - percentage) + '%';
      }

      if (isDraggingV) {
        const rightRect = rightOutputPane.getBoundingClientRect();
        const newHeight = rightRect.bottom - e.clientY;
        const clampedHeight = Math.max(28, Math.min(rightRect.height - 80, newHeight));
        consoleDrawer.style.height = clampedHeight + 'px';
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingH) {
        isDraggingH = false;
        hSplitDivider.classList.remove('active');
        previewIframe.style.pointerEvents = 'auto';
        document.body.style.cursor = 'default';
      }
      if (isDraggingV) {
        isDraggingV = false;
        vSplitDivider.classList.remove('active');
        previewIframe.style.pointerEvents = 'auto';
        document.body.style.cursor = 'default';
      }
    });

    // ----------------------------------------------------
    // IN-EDITOR SYNTAX HIGHLIGHTING ENGINE (Aligned Overlay)
    // ----------------------------------------------------
    function renderEditorHighlight() {
      const code = codeEditorInput.value;
      const ext = activeFileName.split('.').pop() || '';
      editorHighlightCode.innerHTML = highlightSyntax(code, ext, currentDiagnostics);
    }

    function highlightSyntax(code, ext, diagnostics = []) {
      // Create a map of lines with diagnostic errors
      const diagLineMap = {};
      diagnostics.forEach(d => {
        if (!d.file || d.file === activeFileName) {
          diagLineMap[d.line] = d;
        }
      });

      const lines = code.split(String.fromCharCode(10));
      return lines.map((line, idx) => {
        const lineNum = idx + 1;
        let escaped = escapeHtml(line);

        if (ext === 'aux' || ext === 'html') {
          // HTML & .aux syntax
          escaped = escaped
            .replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<span style="color:#8b949e;font-style:italic;">$1</span>')
            .replace(/\\b([a-zA-Z0-9_-]+)\\.(trigger|bind|capture|two-way|to-view|from-view|one-time|for|attr|class|style)\\b/g, '<span style="color:#ff7b72;font-weight:600;">$1</span>.<span style="color:#ffa657;font-weight:700;">$2</span>')
            .replace(/(\\$\\{)([^}]+)(\\})/g, '<span style="color:#eab308;font-weight:700;">$1</span><span style="color:#79c0ff;">$2</span><span style="color:#eab308;font-weight:700;">$3</span>')
            .replace(/(&lt;\\/?)([a-zA-Z0-9_-]+)/g, '$1<span style="color:#7ee787;font-weight:600;">$2</span>')
            .replace(/\\b([a-zA-Z0-9_-]+)=(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span style="color:#79c0ff;">$1</span>=<span style="color:#a5d6ff;">$2</span>');
        } else if (ext === 'ts') {
          // TypeScript syntax
          escaped = escaped
            .replace(/(\\/\\/.*$)/g, '<span style="color:#8b949e;font-style:italic;">$1</span>')
            .replace(/\\b(export|default|class|const|let|var|function|return|this|import|from|extends|implements|new|async|await)\\b/g, '<span style="color:#d2a8ff;font-weight:600;">$1</span>')
            .replace(/\\b(string|number|boolean|any|void|Array)\\b/g, '<span style="color:#56d364;">$1</span>')
            .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span style="color:#a5d6ff;">$1</span>')
            .replace(/\\b(\\d+)\\b/g, '<span style="color:#ffab70;">$1</span>');
        } else if (ext === 'json') {
          // JSON syntax
          escaped = escaped
            .replace(/(&quot;[^&]+&quot;)\\s*:/g, '<span style="color:#79c0ff;font-weight:600;">$1</span>:')
            .replace(/:\\s*(&quot;[^&]*&quot;)/g, ': <span style="color:#a5d6ff;">$1</span>')
            .replace(/:\\s*(\\d+|true|false|null)/g, ': <span style="color:#ffab70;">$1</span>');
        }

        // Apply linter error squiggle if line has diagnostic
        if (diagLineMap[lineNum]) {
          const d = diagLineMap[lineNum];
          const squigglyClass = d.severity === 'error' ? 'lint-error-squiggly' : 'lint-warning-squiggly';
          return '<span class="' + squigglyClass + '" title="' + escapeHtml(d.message) + '">' + escaped + '</span>';
        }

        return escaped;
      }).join(String.fromCharCode(10));
    }

    // Initialize Dropdown
    function initDropdown() {
      dropdownExamplesList.innerHTML = '';
      const categories = {};

      Object.values(EXAMPLES).forEach(ex => {
        if (!categories[ex.category]) categories[ex.category] = [];
        categories[ex.category].push(ex);
      });

      Object.entries(categories).forEach(([categoryName, items]) => {
        const catDiv = document.createElement('div');
        catDiv.className = 'py-0.5';
        
        const catHeader = document.createElement('button');
        catHeader.className = 'w-full px-2.5 py-1 text-[11px] font-semibold text-gray-300 select-none flex items-center justify-between hover:bg-hover rounded transition';
        catHeader.innerHTML = '<div class="flex items-center space-x-1.5"><span class="text-[9px] text-gray-500 font-mono">›</span><span>' + categoryName + '</span></div><span class="text-[9px] text-gray-500">' + items.length + '</span>';
        
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'py-0.5 space-y-0.5';

        catHeader.addEventListener('click', (e) => {
          e.stopPropagation();
          itemsContainer.classList.toggle('hidden');
        });

        items.forEach(it => {
          const btn = document.createElement('button');
          btn.className = 'w-full text-left pl-5 pr-2 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-hover rounded transition block';
          btn.setAttribute('data-id', it.id);
          btn.textContent = it.title;
          
          btn.addEventListener('click', () => {
            loadExample(it.id);
            exampleDropdownMenu.classList.add('hidden');
          });
          itemsContainer.appendChild(btn);
        });

        catDiv.appendChild(catHeader);
        catDiv.appendChild(itemsContainer);
        dropdownExamplesList.appendChild(catDiv);
      });
    }

    // Load an Example
    function loadExample(id) {
      if (!EXAMPLES[id]) return;
      activeExampleId = id;
      const ex = EXAMPLES[id];
      currentExampleLabel.textContent = ex.title;

      document.querySelectorAll('#dropdownExamplesList button[data-id]').forEach(btn => {
        if (btn.getAttribute('data-id') === id) {
          btn.className = 'w-full text-left pl-5 pr-2 py-1 text-[11px] text-accent font-medium bg-accent/10 rounded transition block';
        } else {
          btn.className = 'w-full text-left pl-5 pr-2 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-hover rounded transition block';
        }
      });

      if (id === 'aux-component') {
        componentModelBadge.textContent = 'Aurelia in HTML (.aux SFC)';
        componentModelBadge.className = 'font-mono text-cyan-400';
      } else if (id === 'resumable-counter') {
        componentModelBadge.textContent = 'Resumable Event Delegation';
        componentModelBadge.className = 'font-mono text-purple-400';
      } else {
        componentModelBadge.textContent = 'Aurelia 2 Paired Convention';
        componentModelBadge.className = 'font-mono text-gray-400';
      }

      renderFileTabs(ex);
      switchFile(ex.defaultFile || Object.keys(ex.files)[0]);
      compileAndRender();
    }

    // Render Dynamic File Tabs
    function renderFileTabs(ex) {
      editorTabsBar.innerHTML = '';
      const fileNames = Object.keys(ex.files);

      fileNames.forEach((filename) => {
        const btn = document.createElement('button');
        btn.className = 'file-tab';
        btn.setAttribute('data-filename', filename);
        updateTabLabel(btn, filename);
        
        btn.addEventListener('click', () => {
          switchFile(filename);
        });
        editorTabsBar.appendChild(btn);
      });
    }

    function updateTabLabel(tabEl, filename) {
      const orig = ORIGINAL_EXAMPLES[activeExampleId]?.files[filename];
      const curr = EXAMPLES[activeExampleId]?.files[filename];
      const isDirty = orig !== undefined && curr !== undefined && orig !== curr;
      tabEl.innerHTML = '<span>' + filename + (isDirty ? '*' : '') + '</span>';
      if (isDirty) {
        tabEl.classList.add('text-amber-300');
      } else {
        tabEl.classList.remove('text-amber-300');
      }
    }

    // Switch File in Editor
    function switchFile(filename) {
      const ex = EXAMPLES[activeExampleId];
      if (!ex || ex.files[filename] === undefined) return;

      activeFileName = filename;
      codeEditorInput.value = ex.files[filename];

      document.querySelectorAll('.file-tab').forEach(tab => {
        const f = tab.getAttribute('data-filename');
        if (f === filename) {
          tab.classList.add('file-tab-active');
        } else {
          tab.classList.remove('file-tab-active');
        }
        updateTabLabel(tab, f);
      });

      const ext = filename.split('.').pop() || '';
      document.getElementById('editorStatusText').textContent = filename + ' • ' + ext.toUpperCase();

      updateLineNumbers();
      renderEditorHighlight();
      clearHighlight();
    }

    function updateLineNumbers() {
      const lines = codeEditorInput.value.split(String.fromCharCode(10)).length;
      const diagLineMap = {};
      currentDiagnostics.forEach(d => {
        if (!d.file || d.file === activeFileName) {
          diagLineMap[d.line] = d;
        }
      });

      let numbersHtml = '';
      for (let i = 1; i <= Math.max(lines, 16); i++) {
        if (diagLineMap[i]) {
          const d = diagLineMap[i];
          const dotColor = d.severity === 'error' ? 'text-red-400' : 'text-amber-400';
          numbersHtml += '<div data-line="' + i + '" class="flex items-center justify-end space-x-1" title="' + escapeHtml(d.message) + '"><span class="' + dotColor + '">●</span><span>' + i + '</span></div>';
        } else {
          numbersHtml += '<div data-line="' + i + '">' + i + '</div>';
        }
      }
      editorLineNumbers.innerHTML = numbersHtml;
    }

    // Clean Line-Level Hover Tracing
    function highlightLine(targetFile, searchPhrase) {
      if (targetFile && targetFile !== activeFileName) {
        switchFile(targetFile);
      }

      if (!searchPhrase) {
        clearHighlight();
        return;
      }

      const val = codeEditorInput.value;
      const index = val.indexOf(searchPhrase);
      if (index === -1) {
        clearHighlight();
        return;
      }

      const before = val.substring(0, index);
      const lineNum = before.split(String.fromCharCode(10)).length;
      activeHighlightedLine = lineNum;

      const lineHeight = 22;
      const targetTop = (lineNum - 1) * lineHeight;
      codeEditorInput.scrollTop = Math.max(0, targetTop - 44);
      editorLineNumbers.scrollTop = codeEditorInput.scrollTop;
      editorHighlightPre.scrollTop = codeEditorInput.scrollTop;
      traceHighlightBar.style.top = (targetTop + 8 - codeEditorInput.scrollTop) + 'px';
      traceHighlightBar.style.height = lineHeight + 'px';
      traceHighlightBar.classList.remove('hidden');

      document.querySelectorAll('#editorLineNumbers div').forEach(div => {
        if (Number(div.getAttribute('data-line')) === lineNum) {
          div.classList.add('gutter-line-active');
        } else {
          div.classList.remove('gutter-line-active');
        }
      });
    }

    function clearHighlight() {
      activeHighlightedLine = 0;
      traceHighlightBar.classList.add('hidden');
      document.querySelectorAll('.gutter-line-active').forEach(div => div.classList.remove('gutter-line-active'));
    }

    // Real Dynamic Compilation & Execution Pipeline
    async function compileAndRender() {
      const ex = EXAMPLES[activeExampleId];
      if (!ex) return;

      if (activeFileName && ex.files[activeFileName] !== undefined) {
        ex.files[activeFileName] = codeEditorInput.value;
      }

      const activeTab = document.querySelector('.file-tab[data-filename="' + activeFileName + '"]');
      if (activeTab) updateTabLabel(activeTab, activeFileName);

      const runtimeModeEl = document.querySelector('input[name="opt-runtime-mode"]:checked');
      const strategyEl = document.querySelector('input[name="opt-strategy"]:checked');
      const mode = runtimeModeEl ? runtimeModeEl.value : 'ssr';
      const strategy = strategyEl ? strategyEl.value : 'hydrate';
      const whitelistAudit = optWhitelistAudit ? optWhitelistAudit.checked : true;

      editorLiveIndicator.textContent = '● Compiling...';
      editorLiveIndicator.className = 'text-amber-400 animate-pulse';

      try {
        const res = await fetch('/api/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exampleId: activeExampleId,
            files: ex.files,
            mode,
            strategy,
            whitelistAudit
          })
        });

        const data = await res.json();
        currentDiagnostics = data.diagnostics || [];
        updateLinterUI(currentDiagnostics);

        if (!data.success && data.error) {
          logToConsole('error', 'Compilation Error: ' + data.error);
        }

        renderCompilationOutputs(data, ex);
        editorLiveIndicator.textContent = '● Live Synchronized';
        editorLiveIndicator.className = 'text-emerald-400';
      } catch (err) {
        console.error('[Compilation Request Failed]:', err);
        editorLiveIndicator.textContent = '● Compilation Failed';
        editorLiveIndicator.className = 'text-red-400';
      }
    }

    function updateLinterUI(diagnostics) {
      const errors = diagnostics.filter(d => d.severity === 'error').length;
      const warnings = diagnostics.filter(d => d.severity === 'warning').length;

      if (errors > 0 || warnings > 0) {
        linterStatusIcon.textContent = errors > 0 ? '✖' : '▲';
        linterStatusText.textContent = errors + ' error' + (errors > 1 ? 's' : '') + (warnings > 0 ? ', ' + warnings + ' warning' + (warnings > 1 ? 's' : '') : '');
        linterStatusPill.className = errors > 0 ? 'flex items-center space-x-1 text-red-400 hover:underline cursor-pointer' : 'flex items-center space-x-1 text-amber-400 hover:underline cursor-pointer';

        // Log diagnostics to console drawer
        diagnostics.forEach(d => {
          logToConsole(d.severity, '[' + d.source + '] ' + d.file + ':' + d.line + ':' + d.col + ' - ' + d.message);
        });
      } else {
        linterStatusIcon.textContent = '✔';
        linterStatusText.textContent = '0 errors, 0 warnings';
        linterStatusPill.className = 'flex items-center space-x-1 text-emerald-400 hover:underline cursor-pointer';
      }

      updateLineNumbers();
      renderEditorHighlight();
    }

    function renderCompilationOutputs(data, ex) {
      // 1. Live Preview Iframe
      if (data.htmlDocument) {
        previewIframe.srcdoc = data.htmlDocument;
      }

      // 2. JS Output
      if (data.compiledJs) {
        compiledJsCode.textContent = data.compiledJs;
      }

      // 3. SSR HTML Output
      if (data.rawHtml) {
        rawServerHtmlCode.textContent = data.rawHtml;
      }

      // 4. AST Tree with line tracing
      if (data.ast) {
        renderAstTree(data.ast);
      }

      // 5. Audit & Metrics
      if (data.metrics) {
        const m = data.metrics;
        document.getElementById('metricServerMs').textContent = m.serverMs + ' ms';
        document.getElementById('metricGzipSize').textContent = (m.gzipBytes / 1024).toFixed(2) + ' kB';
        document.getElementById('metricSavings').textContent = m.savings + '%';
        document.getElementById('metricGrade').textContent = m.grade;
        document.getElementById('metricFcp').textContent = m.fcp + ' ms';
        document.getElementById('metricLcp').textContent = m.lcp + ' ms';
        document.getElementById('metricCls').textContent = m.cls;
        document.getElementById('metricSecretStatus').textContent = m.secretStatus;
        document.getElementById('metricXssStatus').textContent = m.xssStatus;

        if (m.secretStatus.includes('WARN')) {
          document.getElementById('metricSecretStatus').className = 'font-bold text-amber-400';
        } else {
          document.getElementById('metricSecretStatus').className = 'font-bold text-emerald-400';
        }
      }

      // Status indicator
      const runtimeModeEl = document.querySelector('input[name="opt-runtime-mode"]:checked');
      const strategyEl = document.querySelector('input[name="opt-strategy"]:checked');
      const mode = runtimeModeEl ? runtimeModeEl.value : 'ssr';
      const strategy = strategyEl ? strategyEl.value : 'hydrate';

      const statusIndicator = document.getElementById('outputStatusIndicator');
      const statusText = document.getElementById('outputStatusText');

      if (strategy === 'static') {
        statusIndicator.className = 'size-2 rounded-full bg-gray-400 inline-block';
        statusText.textContent = 'Static (0 KB JS)';
      } else if (mode === 'csr') {
        statusIndicator.className = 'size-2 rounded-full bg-blue-500 inline-block';
        statusText.textContent = 'CSR Mounted';
      } else if (mode === 'resumable') {
        statusIndicator.className = 'size-2 rounded-full bg-purple-500 inline-block';
        statusText.textContent = 'Resumable Ready';
      } else {
        statusIndicator.className = 'size-2 rounded-full bg-emerald-500 inline-block';
        statusText.textContent = 'Hydrated';
      }
    }

    function renderAstTree(ast) {
      if (!ast) return;
      let html = '<div class="space-y-1">';
      html += '<div class="text-accent font-bold">' + (ast.type || 'CustomElementDefinition') + ' {</div>';
      html += '  <div class="pl-4 text-gray-400">name: <span class="text-white">"' + (ast.name || 'component') + '"</span></div>';
      if (ast.sourceFile) {
        html += '  <div class="pl-4 text-gray-500">sourceFile: <span class="text-cyan-400">"' + ast.sourceFile + '"</span></div>';
      }

      if (ast.template) {
        const tmplFile = ast.template.file || '';
        html += '  <div class="pl-4 text-gray-400 hover-trace cursor-pointer p-0.5 rounded transition" data-file="' + tmplFile + '" data-trace="' + (ast.template.root || '') + '">';
        html += '    <span class="text-primary">template</span>: ' + (ast.template.type || 'TemplateDefinition') + ' {';
        html += ' <span class="text-gray-500">root: "' + (ast.template.root || '') + '"</span> }';
        html += '  </div>';

        if (ast.template.children) {
          html += '  <div class="pl-6 space-y-1 border-l border-border/60 my-1">';
          ast.template.children.forEach(c => {
            const cFile = c.traceFile || tmplFile;
            const searchTarget = c.traceSearch || c.tag || '';
            html += '    <div class="hover-trace cursor-pointer p-0.5 rounded transition hover:bg-hover" data-file="' + cFile + '" data-trace="' + escapeHtml(searchTarget) + '">';
            html += '      <span class="text-cyan-400">&lt;' + c.tag + '&gt;</span>: ';
            if (c.binding) html += ' <span class="text-accent font-bold">' + escapeHtml(c.binding) + '</span>';
            if (c.interpolation) html += ' <span class="text-emerald-400 font-mono">' + escapeHtml(c.interpolation) + '</span>';
            if (c.controller) html += ' <span class="text-yellow-400 font-bold">' + escapeHtml(c.controller) + '</span>';
            if (c.resumableEvent) html += ' <span class="text-purple-400 font-mono">' + escapeHtml(c.resumableEvent) + '</span>';
            if (c.text) html += ' <span class="text-gray-300">' + escapeHtml(c.text) + '</span>';
            html += '    </div>';
          });
          html += '  </div>';
        }
      }

      if (ast.bindables) {
        html += '  <div class="pl-4 text-gray-400">bindables: <span class="text-emerald-400">' + JSON.stringify(ast.bindables) + '</span></div>';
      }
      if (ast.methods) {
        html += '  <div class="pl-4 text-gray-400">methods: <span class="text-yellow-400">' + JSON.stringify(ast.methods) + '</span></div>';
      }

      html += '<div class="text-accent font-bold">}</div>';
      html += '</div>';

      astTreeContainer.innerHTML = html;
      bindHoverTraceListeners();
    }

    function bindHoverTraceListeners() {
      document.querySelectorAll('.hover-trace').forEach(el => {
        el.addEventListener('mouseenter', () => {
          el.classList.add('ast-node-hovered');
          const traceFile = el.getAttribute('data-file');
          const traceSearch = el.getAttribute('data-trace');
          highlightLine(traceFile, traceSearch);
        });
        el.addEventListener('mouseleave', () => {
          el.classList.remove('ast-node-hovered');
          clearHighlight();
        });
      });
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // ----------------------------------------------------
    // CODE EDITOR KEYBOARD HANDLERS (Indent, Enter, Brackets)
    // ----------------------------------------------------
    codeEditorInput.addEventListener('keydown', (e) => {
      const start = codeEditorInput.selectionStart;
      const end = codeEditorInput.selectionEnd;
      const val = codeEditorInput.value;

      // 1. TAB & SHIFT+TAB (2-space indent / unindent)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          const startLineIndex = val.lastIndexOf(String.fromCharCode(10), start - 1) + 1;
          let endLineIndex = val.indexOf(String.fromCharCode(10), end);
          if (endLineIndex === -1) endLineIndex = val.length;

          const lines = val.substring(startLineIndex, endLineIndex).split(String.fromCharCode(10));
          let removedTotal = 0;
          const outdented = lines.map(line => {
            if (line.startsWith('  ')) {
              removedTotal += 2;
              return line.substring(2);
            } else if (line.startsWith(' ')) {
              removedTotal += 1;
              return line.substring(1);
            }
            return line;
          }).join(String.fromCharCode(10));

          codeEditorInput.value = val.substring(0, startLineIndex) + outdented + val.substring(endLineIndex);
          codeEditorInput.selectionStart = Math.max(startLineIndex, start - 2);
          codeEditorInput.selectionEnd = Math.max(startLineIndex, end - removedTotal);
        } else {
          if (start === end) {
            codeEditorInput.value = val.substring(0, start) + '  ' + val.substring(end);
            codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + 2;
          } else {
            const startLineIndex = val.lastIndexOf(String.fromCharCode(10), start - 1) + 1;
            let endLineIndex = val.indexOf(String.fromCharCode(10), end);
            if (endLineIndex === -1) endLineIndex = val.length;

            const lines = val.substring(startLineIndex, endLineIndex).split(String.fromCharCode(10));
            const indented = lines.map(line => '  ' + line).join(String.fromCharCode(10));

            codeEditorInput.value = val.substring(0, startLineIndex) + indented + val.substring(endLineIndex);
            codeEditorInput.selectionStart = start + 2;
            codeEditorInput.selectionEnd = end + (lines.length * 2);
          }
        }
        renderEditorHighlight();
        triggerLiveUpdate();
        return;
      }

      // 2. ENTER (Auto-indentation)
      if (e.key === 'Enter') {
        e.preventDefault();
        const lastNewline = val.lastIndexOf(String.fromCharCode(10), start - 1);
        const currentLine = val.substring(lastNewline + 1, start);
        const indentMatch = currentLine.match(/^\\s*/);
        const indent = indentMatch ? indentMatch[0] : '';
        const trimmed = currentLine.trim();
        const nextChar = val.charAt(start);

        const opensBlock = /[{(\\[]$/.test(trimmed) || (/<[a-zA-Z0-9_-]+(\\s+[^>]*)?>$/.test(trimmed) && !trimmed.endsWith('/>'));
        const closesMatching = (trimmed.endsWith('{') && nextChar === '}') ||
                               (trimmed.endsWith('(') && nextChar === ')') ||
                               (trimmed.endsWith('[') && nextChar === ']');

        if (opensBlock && closesMatching) {
          const insert = String.fromCharCode(10) + indent + '  ' + String.fromCharCode(10) + indent;
          codeEditorInput.value = val.substring(0, start) + insert + val.substring(start);
          codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + indent.length + 3;
        } else if (opensBlock) {
          const insert = String.fromCharCode(10) + indent + '  ';
          codeEditorInput.value = val.substring(0, start) + insert + val.substring(start);
          codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + insert.length;
        } else {
          const insert = String.fromCharCode(10) + indent;
          codeEditorInput.value = val.substring(0, start) + insert + val.substring(start);
          codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + insert.length;
        }
        updateLineNumbers();
        renderEditorHighlight();
        triggerLiveUpdate();
        return;
      }

      // 3. AUTO-CLOSING PAIRS: () [] {} '' "" backticks
      const bt = String.fromCharCode(96);
      const pairs = { '(': ')', '[': ']', '{': '}', "'": "'", '"': '"' };
      pairs[bt] = bt;

      if (pairs[e.key]) {
        if (start !== end) {
          e.preventDefault();
          const selected = val.substring(start, end);
          codeEditorInput.value = val.substring(0, start) + e.key + selected + pairs[e.key] + val.substring(end);
          codeEditorInput.selectionStart = start + 1;
          codeEditorInput.selectionEnd = end + 1;
          renderEditorHighlight();
          triggerLiveUpdate();
          return;
        } else {
          if (val.charAt(start) === e.key && ["'", '"', bt].includes(e.key)) {
            e.preventDefault();
            codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + 1;
            return;
          }
          e.preventDefault();
          codeEditorInput.value = val.substring(0, start) + e.key + pairs[e.key] + val.substring(end);
          codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + 1;
          renderEditorHighlight();
          triggerLiveUpdate();
          return;
        }
      }

      // Skip over closing brackets if typed
      if ([')', ']', '}'].includes(e.key) && val.charAt(start) === e.key) {
        e.preventDefault();
        codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + 1;
        return;
      }

      // 4. BACKSPACE (Pair Deletion)
      if (e.key === 'Backspace' && start === end && start > 0) {
        const prevChar = val.charAt(start - 1);
        const nextChar = val.charAt(start);
        if (
          (prevChar === '(' && nextChar === ')') ||
          (prevChar === '[' && nextChar === ']') ||
          (prevChar === '{' && nextChar === '}') ||
          (prevChar === "'" && nextChar === "'") ||
          (prevChar === '"' && nextChar === '"') ||
          (prevChar === bt && nextChar === bt)
        ) {
          e.preventDefault();
          codeEditorInput.value = val.substring(0, start - 1) + val.substring(start + 1);
          codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start - 1;
          renderEditorHighlight();
          triggerLiveUpdate();
          return;
        }
      }

      // Shortcut: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (liveUpdateTimer) clearTimeout(liveUpdateTimer);
        compileAndRender();
      }
    });

    // Synchronize scrolling between textarea and syntax highlight overlay
    codeEditorInput.addEventListener('scroll', () => {
      editorHighlightPre.scrollTop = codeEditorInput.scrollTop;
      editorHighlightPre.scrollLeft = codeEditorInput.scrollLeft;
      editorLineNumbers.scrollTop = codeEditorInput.scrollTop;

      if (activeHighlightedLine > 0) {
        const lineHeight = 22;
        const targetTop = (activeHighlightedLine - 1) * lineHeight + 8 - codeEditorInput.scrollTop;
        traceHighlightBar.style.top = targetTop + 'px';
      }
    });

    function triggerLiveUpdate() {
      updateLineNumbers();
      renderEditorHighlight();
      if (liveUpdateTimer) clearTimeout(liveUpdateTimer);
      liveUpdateTimer = setTimeout(() => {
        compileAndRender();
      }, 350);
    }

    codeEditorInput.addEventListener('input', triggerLiveUpdate);

    // Output views tab switching
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

    // Header buttons
    document.getElementById('headerRunBtn').addEventListener('click', () => {
      if (liveUpdateTimer) clearTimeout(liveUpdateTimer);
      compileAndRender();
    });

    document.getElementById('headerResetBtn').addEventListener('click', () => {
      EXAMPLES[activeExampleId] = JSON.parse(JSON.stringify(ORIGINAL_EXAMPLES[activeExampleId]));
      loadExample(activeExampleId);
    });

    document.getElementById('copyHtmlBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(rawServerHtmlCode.textContent || '');
      document.getElementById('copyHtmlBtn').textContent = 'Copied!';
      setTimeout(() => { document.getElementById('copyHtmlBtn').textContent = 'Copy HTML'; }, 1500);
    });

    // Compiler options reactive listeners
    document.querySelectorAll('input[name="opt-runtime-mode"], input[name="opt-strategy"]').forEach(input => {
      input.addEventListener('change', () => {
        compileAndRender();
      });
    });
    if (optWhitelistAudit) {
      optWhitelistAudit.addEventListener('change', () => {
        compileAndRender();
      });
    }

    // Console drawer collapse toggle
    const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
    const consoleArrow = document.getElementById('consoleArrow');
    let isConsoleCollapsed = false;

    toggleConsoleBtn.addEventListener('click', () => {
      isConsoleCollapsed = !isConsoleCollapsed;
      if (isConsoleCollapsed) {
        consoleDrawer.style.height = '28px';
        consoleArrow.textContent = '▲';
      } else {
        consoleDrawer.style.height = '144px';
        consoleArrow.textContent = '▼';
      }
    });

    document.getElementById('clearConsoleBtn').addEventListener('click', () => {
      consoleLogsStream.innerHTML = '';
      consoleLogCount = 0;
      consoleBadge.textContent = '0';
    });

    document.getElementById('linterStatusPill').addEventListener('click', () => {
      if (isConsoleCollapsed) {
        isConsoleCollapsed = false;
        consoleDrawer.style.height = '144px';
        consoleArrow.textContent = '▼';
      }
      consoleLogsStream.scrollTop = consoleLogsStream.scrollHeight;
    });

    function logToConsole(level, message) {
      consoleLogCount++;
      consoleBadge.textContent = String(consoleLogCount);

      const row = document.createElement('div');
      row.className = 'flex items-start space-x-2 py-0.5 text-[11px]';
      const badgeColor = level === 'error' ? 'text-red-400' : (level === 'warning' ? 'text-amber-400' : (level === 'warn' ? 'text-amber-400' : 'text-primary'));
      row.innerHTML = '<span class="opacity-50 font-mono text-[10px]">' + new Date().toLocaleTimeString() + '</span> ' +
                       '<span class="font-bold uppercase text-[10px] ' + badgeColor + '">[' + level + ']</span> ' +
                       '<span class="flex-1 select-text text-gray-200">' + escapeHtml(message) + '</span>';
      consoleLogsStream.appendChild(row);
      consoleLogsStream.scrollTop = consoleLogsStream.scrollHeight;
    }

    // Real Console postMessage listener
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'playground:console') {
        logToConsole(event.data.level, event.data.message);
      }
    });

    // Initial Bootstrap
    initDropdown();
    loadExample('counter-card');
  </script>
</body>
</html>
`;
}
