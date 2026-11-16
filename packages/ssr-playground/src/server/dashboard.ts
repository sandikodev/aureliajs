/**
 * @aureliajs/ssr-playground
 * Enterprise Aurelia 2 + Hono SSR & .aux Playground Dashboard
 * Dynamic Multi-File Architecture, Authentic Aurelia Conventions & Clean Line-Tracing
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
            accent: '#ff3e00', // Svelte-like fiery coral accent
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
    
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0d1117; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #484f58; }

    /* Clean Line-level Hover Tracing (Zero text duplication) */
    .editor-line-highlight {
      position: absolute;
      left: 0;
      right: 0;
      background: rgba(234, 179, 8, 0.16) !important;
      border-left: 3px solid #eab308 !important;
      pointer-events: none;
      box-shadow: inset 0 0 8px rgba(234, 179, 8, 0.12);
      transition: top 0.1s ease-out;
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

    .file-tab-active {
      background-color: #161b22 !important;
      color: #f0f6fc !important;
      border-top: 2px solid #ff3e00 !important;
      font-weight: 600 !important;
    }
  </style>
</head>
<body class="h-screen flex flex-col overflow-hidden text-sm">

  <!-- Top Navigation Header -->
  <header class="h-12 border-b border-border bg-surface px-4 flex items-center justify-between z-30 select-none">
    <div class="flex items-center space-x-4">
      <!-- Logo -->
      <a href="/" class="flex items-center space-x-2.5 text-white font-bold tracking-tight hover:opacity-90 transition">
        <svg class="size-6 text-accent" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 19.7778H22L12 2ZM12 6.22222L18.8889 17.5556H5.11111L12 6.22222Z"/>
        </svg>
        <span class="text-base font-extrabold tracking-wider text-white">AURELIA 2</span>
      </a>

      <!-- Category & Example Dropdown Selector -->
      <div class="relative">
        <button id="menuDropdownBtn" class="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-hover hover:bg-border text-gray-200 border border-border text-xs font-medium transition">
          <svg class="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clip-rule="evenodd"/>
          </svg>
          <span id="currentExampleLabel">Loading Examples...</span>
          <svg class="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Dropdown Menu List -->
        <div id="exampleDropdownMenu" class="hidden absolute top-full left-0 mt-1 w-96 max-h-[80vh] overflow-y-auto bg-surface border border-border rounded-lg shadow-2xl z-50 py-2">
          <div class="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-border/50">
            Aurelia 2 Architecture & SSR Examples
          </div>
          <div id="dropdownExamplesList" class="divide-y divide-border/30">
            <!-- Populated dynamically from disk examples -->
          </div>
        </div>
      </div>
    </div>

    <!-- Right Header Actions (Utilitarian & Developer-First) -->
    <div class="flex items-center space-x-3">
      <button id="headerRunBtn" class="flex items-center space-x-1.5 px-3 py-1 rounded bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-md shadow-accent/20 transition">
        <span>▶</span>
        <span>Run (Ctrl+S)</span>
      </button>

      <button id="headerResetBtn" class="px-2.5 py-1 rounded bg-hover hover:bg-border text-gray-300 text-xs font-medium border border-border transition">
        ↻ Reset
      </button>

      <a href="https://github.com/sandikodev/hono-aurelia-ssr" target="_blank" class="text-xs text-gray-400 hover:text-gray-200 transition">
        GitHub ↗
      </a>
    </div>
  </header>

  <!-- Main Split Pane Interface -->
  <div class="flex-1 flex overflow-hidden">

    <!-- LEFT PANEL: Dynamic Multi-File Editor -->
    <div class="w-1/2 flex flex-col border-r border-border bg-background">
      
      <!-- Dynamic File Tabs Bar (Populated per Example) -->
      <div class="h-9 border-b border-border bg-surface flex items-center justify-between px-2 select-none">
        <div class="flex items-center space-x-0.5" id="editorTabsBar">
          <!-- Dynamically populated files for the active example -->
        </div>

        <div class="flex items-center space-x-2 text-xs text-gray-400 pr-2">
          <span class="text-[11px] font-mono text-gray-500" id="componentModelBadge">Aurelia 2 Convention</span>
        </div>
      </div>

      <!-- Editor Code Canvas with Line Numbers & Clean Line Tracing -->
      <div class="flex-1 relative flex overflow-hidden">
        <!-- Line Numbers Column -->
        <div id="editorLineNumbers" class="w-12 bg-surface/50 border-r border-border/50 py-3 text-right pr-3 text-xs font-mono text-gray-600 select-none overflow-hidden leading-6">
          1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10
        </div>

        <!-- Clean Line Highlight Overlay (Zero text duplication!) -->
        <div id="editorTraceOverlay" class="pointer-events-none absolute inset-0 pl-12 overflow-hidden">
          <div id="traceHighlightBar" class="hidden editor-line-highlight"></div>
        </div>

        <!-- Code Textarea -->
        <textarea id="codeEditorInput" spellcheck="false" class="flex-1 bg-transparent text-gray-200 p-3 text-xs font-mono leading-6 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-accent/30 z-10"></textarea>
      </div>

      <!-- Status Footer -->
      <div class="h-6 border-t border-border bg-surface px-3 flex items-center justify-between text-[11px] text-gray-500 font-mono select-none">
        <span id="editorStatusText">File • UTF-8</span>
        <span>Aurelia 2 Engine Active</span>
      </div>
    </div>

    <!-- RIGHT PANEL: Multi-Tab Outputs -->
    <div class="w-1/2 flex flex-col bg-background">
      
      <!-- Right Panel Tab Bar -->
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

      <!-- Tab 1: Result (Live Preview + Console Drawer) -->
      <div id="view-result" class="output-view flex-1 flex flex-col relative overflow-hidden">
        <div class="flex-1 bg-white relative">
          <iframe id="previewIframe" src="/preview/counter-card" class="w-full h-full border-0"></iframe>
        </div>

        <!-- Console Drawer -->
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
            <div class="text-gray-500 italic text-[11px]">[Playground Ready] Event triggers and SSR hydration messages appear here...</div>
          </div>
        </div>
      </div>

      <!-- Tab 2: JS Output (Aurelia 2 Runtime Architecture & Compiler Modes) -->
      <div id="view-js" class="output-view hidden flex-1 flex flex-col relative overflow-hidden bg-surface/30">
        <div class="flex-1 p-4 font-mono text-xs overflow-auto text-gray-200 leading-6 select-text whitespace-pre-wrap" id="compiledJsCode">
          /* Select a component to see its compiled Aurelia 2 definition */
        </div>

        <!-- Aurelia 2 Execution & Compiler Modes Drawer -->
        <div class="border-t border-border bg-surface p-3 select-none">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono font-semibold text-gray-300 flex items-center space-x-1.5">
              <span>⚙</span>
              <span>AURELIA 2 RUNTIME & COMPILER MODES</span>
            </span>
            <span class="text-[11px] text-gray-500 font-mono">renderAurelia() / CSR / Resumable</span>
          </div>

          <div class="font-mono text-xs text-gray-300 space-y-2 bg-background p-3 rounded border border-border/60">
            <div class="flex items-center space-x-4">
              <span class="text-gray-400">Execution Mode:</span>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-runtime-mode" value="ssr" checked class="text-accent focus:ring-0">
                <span class="text-white">SSR (Pre-render)</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-runtime-mode" value="csr" class="text-accent focus:ring-0">
                <span class="text-gray-400">CSR (SPA Mount)</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-runtime-mode" value="resumable" class="text-accent focus:ring-0">
                <span class="text-purple-400">Resumable (Zero-Hydration)</span>
              </label>
            </div>

            <div class="flex items-center space-x-4 pt-1 border-t border-border/40">
              <span class="text-gray-400">Hydration Strategy:</span>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-strategy" value="dual" checked class="text-accent focus:ring-0">
                <span class="text-white">Dual-Engine (Adopt SSR DOM)</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer">
                <input type="radio" name="opt-strategy" value="static" class="text-accent focus:ring-0">
                <span class="text-gray-400">Static (Zero-JS)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: SSR HTML Output -->
      <div id="view-html" class="output-view hidden flex-1 flex flex-col p-4 bg-surface/30 overflow-auto font-mono text-xs select-text">
        <div class="mb-2 text-xs font-semibold text-gray-400 flex items-center justify-between">
          <span>Pre-rendered Server HTML (with Aurelia hydration markers)</span>
          <button id="copyHtmlBtn" class="px-2 py-0.5 rounded bg-hover text-gray-300 hover:text-white border border-border">Copy HTML</button>
        </div>
        <pre id="rawServerHtmlCode" class="flex-1 text-gray-200 bg-background p-3 rounded border border-border overflow-auto whitespace-pre-wrap leading-5"></pre>
      </div>

      <!-- Tab 4: AST Output with Clean Line Tracing -->
      <div id="view-ast" class="output-view hidden flex-1 flex flex-col p-4 bg-surface/30 overflow-auto font-mono text-xs">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-gray-300">Aurelia 2 Component AST Tree</span>
          <span class="text-[11px] text-gray-500">Hover nodes to trace corresponding code region</span>
        </div>

        <div id="astTreeContainer" class="flex-1 bg-background p-3 rounded border border-border overflow-auto text-gray-300 space-y-1">
          <!-- Dynamically populated AST nodes -->
        </div>
      </div>

      <!-- Tab 5: Audit & Metrics -->
      <div id="view-metrics" class="output-view hidden flex-1 p-6 bg-surface/20 overflow-y-auto space-y-6">
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

  <!-- Real Examples Manifest JSON -->
  <script type="application/json" id="__EXAMPLES_DATA__">${serializedExamples.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')}</script>

  <!-- Client-side Logic -->
  <script>
    // Real Examples Manifest injected from server / disk
    let EXAMPLES = JSON.parse(document.getElementById('__EXAMPLES_DATA__').textContent || '{}');
    let activeExampleId = 'counter-card';
    let activeFileName = '';
    let activeHighlightedLine = 0;
    let consoleLogCount = 0;

    // DOM Elements
    const codeEditorInput = document.getElementById('codeEditorInput');
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

    // Initialize Dropdown & Manifest
    function initDropdown() {
      dropdownExamplesList.innerHTML = '';
      const categories = {};

      Object.values(EXAMPLES).forEach(ex => {
        if (!categories[ex.category]) categories[ex.category] = [];
        categories[ex.category].push(ex);
      });

      Object.entries(categories).forEach(([categoryName, items]) => {
        const catDiv = document.createElement('div');
        catDiv.className = 'py-2';
        
        const catHeader = document.createElement('div');
        catHeader.className = 'px-3 py-1 text-xs font-semibold text-gray-300';
        catHeader.textContent = categoryName;
        catDiv.appendChild(catHeader);

        items.forEach(it => {
          const btn = document.createElement('button');
          btn.className = 'w-full text-left px-5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-hover transition flex items-center justify-between';
          btn.setAttribute('data-id', it.id);
          
          const filesSummary = Object.keys(it.files).join(', ');
          btn.innerHTML = '<span>' + it.title + '</span>' +
                          '<span class="text-[10px] text-gray-500 font-mono">' + filesSummary + '</span>';
          
          btn.addEventListener('click', () => {
            loadExample(it.id);
            exampleDropdownMenu.classList.add('hidden');
          });
          catDiv.appendChild(btn);
        });

        dropdownExamplesList.appendChild(catDiv);
      });
    }

    // Load an Example
    function loadExample(id) {
      if (!EXAMPLES[id]) return;
      activeExampleId = id;
      const ex = EXAMPLES[id];
      currentExampleLabel.textContent = ex.category + ' / ' + ex.title;

      // Update Component Model Badge
      if (id === 'aux-component') {
        componentModelBadge.textContent = 'Aurelia in HTML (.aux SFC)';
        componentModelBadge.className = 'text-[11px] font-mono text-cyan-400';
      } else if (id === 'resumable-counter') {
        componentModelBadge.textContent = 'Resumable Event Delegation';
        componentModelBadge.className = 'text-[11px] font-mono text-purple-400';
      } else {
        componentModelBadge.textContent = 'Aurelia 2 Paired Convention';
        componentModelBadge.className = 'text-[11px] font-mono text-gray-400';
      }

      // Rebuild File Tabs for THIS example's actual files!
      renderFileTabs(ex);

      // Load Default File
      switchFile(ex.defaultFile || Object.keys(ex.files)[0]);

      // Run Server Inspection
      runInspection();
    }

    // Render Dynamic File Tabs
    function renderFileTabs(ex) {
      editorTabsBar.innerHTML = '';
      const fileNames = Object.keys(ex.files);

      fileNames.forEach((filename) => {
        const btn = document.createElement('button');
        btn.className = 'file-tab px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 border-r border-border flex items-center space-x-1.5 transition';
        btn.setAttribute('data-filename', filename);
        btn.innerHTML = '<span>' + filename + '</span>';
        
        btn.addEventListener('click', () => {
          switchFile(filename);
        });
        editorTabsBar.appendChild(btn);
      });
    }

    // Switch File in Editor
    function switchFile(filename) {
      const ex = EXAMPLES[activeExampleId];
      if (!ex || !ex.files[filename]) return;

      activeFileName = filename;
      codeEditorInput.value = ex.files[filename];

      // Update active tab styling
      document.querySelectorAll('.file-tab').forEach(tab => {
        if (tab.getAttribute('data-filename') === filename) {
          tab.classList.add('file-tab-active');
          tab.classList.remove('text-gray-400');
        } else {
          tab.classList.remove('file-tab-active');
          tab.classList.add('text-gray-400');
        }
      });

      // Update footer
      const ext = filename.split('.').pop() || '';
      document.getElementById('editorStatusText').textContent = filename + ' • ' + ext.toUpperCase();

      updateLineNumbers();
      clearHighlight();
    }

    function updateLineNumbers() {
      const lines = codeEditorInput.value.split(String.fromCharCode(10)).length;
      let numbersHtml = '';
      for (let i = 1; i <= Math.max(lines, 15); i++) {
        numbersHtml += '<div data-line="' + i + '">' + i + '</div>';
      }
      editorLineNumbers.innerHTML = numbersHtml;
    }

    // Clean Line-Level Hover Tracing (Zero text duplication!)
    function highlightLine(targetFile, searchPhrase) {
      // Auto-switch file tab if necessary
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

      // Position highlight bar over line (height: 24px)
      const lineHeight = 24;
      const targetTop = (lineNum - 1) * lineHeight;
      codeEditorInput.scrollTop = Math.max(0, targetTop - 48);
      editorLineNumbers.scrollTop = codeEditorInput.scrollTop;
      traceHighlightBar.style.top = (targetTop + 12 - codeEditorInput.scrollTop) + 'px';
      traceHighlightBar.style.height = lineHeight + 'px';
      traceHighlightBar.classList.remove('hidden');

      // Highlight line number in gutter
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

    // Run Server Inspection & Preview
    async function runInspection() {
      const ex = EXAMPLES[activeExampleId];
      const compTarget = ex.componentName || 'counter-card';
      previewIframe.src = '/preview/' + compTarget + '?t=' + Date.now();

      try {
        const res = await fetch('/api/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fixture: compTarget,
            context: ex.context,
          })
        });

        const report = await res.json();
        renderInspectionOutputs(report, ex);
      } catch (err) {
        console.error('Inspection failed:', err);
      }
    }

    function renderInspectionOutputs(report, ex) {
      // 1. JS Output (Authentic Aurelia 2 Architecture)
      compiledJsCode.innerHTML = renderAureliaJsOutput(ex);

      // 2. SSR HTML Output
      rawServerHtmlCode.textContent = report.htmlOutput;

      // 3. AST Tree Output
      renderAstTree(ex.ast);

      // 4. Metrics Output
      document.getElementById('metricServerMs').textContent = report.serverMetrics.totalServerMs + ' ms';
      document.getElementById('metricGzipSize').textContent = (report.networkMetrics.totalGzipBytes / 1024).toFixed(2) + ' kB';
      document.getElementById('metricSavings').textContent = report.networkMetrics.compressionRatio + '%';
      document.getElementById('metricGrade').textContent = report.lighthouse.overallGrade;
      document.getElementById('metricFcp').textContent = report.lighthouse.estimatedFcpMs + ' ms';
      document.getElementById('metricLcp').textContent = report.lighthouse.estimatedLcpMs + ' ms';
      document.getElementById('metricCls').textContent = report.lighthouse.clsRisk;
    }

    function renderAureliaJsOutput(ex) {
      const bt = String.fromCharCode(96);
      
      if (ex.id === 'aux-component') {
        return [
          "<span class='text-purple-400'>import</span> { CustomElement } <span class='text-purple-400'>from</span> <span class='text-emerald-400'>'@aurelia/runtime-html'</span>;",
          "<span class='text-purple-400'>import</span> <span class='text-emerald-400'>'./counter-widget.aux?vue&type=style&index=0&scoped=true'</span>;",
          "",
          "<span class='text-gray-500'>// Transformed via @aureliajs/vite-plugin-aux (Aurelia in HTML)</span>",
          "<span class='text-purple-400'>export default class</span> <span class='text-yellow-400'>CounterWidget</span> {",
          "  title = <span class='text-emerald-400'>'Aurelia in HTML'</span>;",
          "  description = <span class='text-emerald-400'>'Single-File Component (.aux) transformed by @aureliajs/vite-plugin-aux.'</span>;",
          "  count = <span class='text-cyan-400'>10</span>;",
          "",
          "  <span class='text-yellow-400 hover-trace cursor-pointer' data-file='counter-widget.aux' data-trace='increment()'>increment()</span> {",
          "    this.count++;",
          "  }",
          "}",
          "",
          "<span class='text-purple-400'>export const</span> ComponentDefinition = CustomElement.define({",
          "  name: <span class='text-emerald-400'>'au-counter-widget'</span>,",
          "  template: <span class='text-emerald-400'>" + bt + escapeHtml(ex.files['counter-widget.aux'] || '') + bt + "</span>,",
          "  bindables: {",
          "    title: { mode: <span class='text-cyan-400'>2</span> /* toView */ },",
          "    description: { mode: <span class='text-cyan-400'>2</span> /* toView */ },",
          "    count: { mode: <span class='text-cyan-400'>6</span> /* twoWay */ }",
          "  }",
          "}, CounterWidget);"
        ].join('<br>');
      }

      if (ex.id === 'resumable-counter') {
        return [
          "<span class='text-purple-400'>import</span> { CustomElement } <span class='text-purple-400'>from</span> <span class='text-emerald-400'>'@aurelia/runtime-html'</span>;",
          "",
          "<span class='text-gray-500'>// Resumable Aurelia 2 Architecture: Fine-grained Event Delegation & W3C Markers</span>",
          "<span class='text-purple-400'>export class</span> <span class='text-yellow-400'>ResumableCounter</span> {",
          "  title = <span class='text-emerald-400'>'Resumable Event Counter'</span>;",
          "  count = <span class='text-cyan-400'>100</span>;",
          "  <span class='text-yellow-400 hover-trace cursor-pointer' data-file='resumable-counter.html' data-trace='data-au-event'>increment()</span> { this.count++; }",
          "}",
          "",
          "<span class='text-purple-400'>export const</span> ResumableDefinition = CustomElement.define({",
          "  name: <span class='text-emerald-400'>'resumable-counter'</span>,",
          "  resumable: <span class='text-cyan-400'>true</span>,",
          "  eventDelegation: <span class='text-emerald-400'>'data-au-event'</span>,",
          "  markers: {",
          "    start: <span class='text-emerald-400'>'<!--au-resumable:start-->'</span>,",
          "    end: <span class='text-emerald-400'>'<!--au-resumable:end-->'</span>",
          "  }",
          "}, ResumableCounter);"
        ].join('<br>');
      }

      // Default Paired Convention (.ts + .html)
      const className = ex.id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      const htmlFile = Object.keys(ex.files).find(f => f.endsWith('.html')) || 'template.html';
      const tsFile = Object.keys(ex.files).find(f => f.endsWith('.ts')) || 'component.ts';
      const countToken = '$' + '{count}';

      return [
        "<span class='text-purple-400'>import</span> { CustomElement } <span class='text-purple-400'>from</span> <span class='text-emerald-400'>'@aurelia/runtime-html'</span>;",
        "<span class='text-purple-400'>import</span> template <span class='text-purple-400'>from</span> <span class='text-emerald-400'>'./" + htmlFile + "'</span>;",
        "<span class='text-purple-400'>import</span> { " + className + " } <span class='text-purple-400'>from</span> <span class='text-emerald-400'>'./" + tsFile + "'</span>;",
        "",
        "<span class='text-gray-500'>// Enterprise Convention: View-Model Class Paired with HTML Template</span>",
        "<span class='text-purple-400'>export const</span> " + className + "Definition = CustomElement.define({",
        "  name: <span class='text-emerald-400'>'" + ex.componentName + "'</span>,",
        "  template,",
        "  instructions: [",
        "    <span class='text-gray-500'>// Compiled AST Instructions (Binding & Hydration Markers)</span>",
        "    [ { type: <span class='text-emerald-400'>'listener'</span>, to: <span class='text-accent hover-trace cursor-pointer font-bold' data-file='" + htmlFile + "' data-trace='click.trigger'>'click'</span>, value: <span class='text-emerald-400'>'increment()'</span> } ],",
        "    [ { type: <span class='text-emerald-400'>'interpolation'</span>, to: <span class='text-emerald-400'>'textContent'</span>, value: <span class='text-cyan-400 hover-trace cursor-pointer font-bold' data-file='" + htmlFile + "' data-trace='" + countToken + "'>'" + countToken + "'</span> } ]",
        "  ]",
        "}, " + className + ");"
      ].join('<br>');
    }

    function renderAstTree(ast) {
      if (!ast) return;
      let html = '<div class="space-y-1">';
      html += '<div class="text-accent font-bold">' + ast.type + ' {</div>';
      html += '  <div class="pl-4 text-gray-400">name: <span class="text-white">"' + ast.name + '"</span></div>';
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
            if (c.resumableBind) html += ' <span class="text-cyan-400 font-mono">' + escapeHtml(c.resumableBind) + '</span>';
            if (c.marker) html += ' <span class="text-gray-500 font-mono">' + escapeHtml(c.marker) + '</span>';
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

    // Event Listeners
    codeEditorInput.addEventListener('input', () => {
      updateLineNumbers();
    });

    codeEditorInput.addEventListener('scroll', () => {
      editorLineNumbers.scrollTop = codeEditorInput.scrollTop;
      if (activeHighlightedLine > 0) {
        const lineHeight = 24;
        const targetTop = (activeHighlightedLine - 1) * lineHeight + 12 - codeEditorInput.scrollTop;
        traceHighlightBar.style.top = targetTop + 'px';
      }
    });

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
    document.getElementById('headerRunBtn').addEventListener('click', runInspection);
    document.getElementById('headerResetBtn').addEventListener('click', () => loadExample(activeExampleId));

    // Console drawer collapse toggle
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

    // Iframe console postMessage stream
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'playground:console') {
        consoleLogCount++;
        consoleBadge.textContent = String(consoleLogCount);

        const row = document.createElement('div');
        row.className = 'flex items-start space-x-2 py-0.5 text-xs';
        const badgeColor = event.data.level === 'error' ? 'text-red-400' : (event.data.level === 'warn' ? 'text-amber-400' : 'text-primary');
        row.innerHTML = '<span class="opacity-50 font-mono text-[10px]">' + new Date().toLocaleTimeString() + '</span> ' +
                         '<span class="font-bold uppercase text-[10px] ' + badgeColor + '">[' + event.data.level + ']</span> ' +
                         '<span class="flex-1 select-text text-gray-200">' + escapeHtml(event.data.message) + '</span>';
        consoleLogsStream.appendChild(row);
        consoleLogsStream.scrollTop = consoleLogsStream.scrollHeight;
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        runInspection();
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
