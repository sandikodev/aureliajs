/**
 * @aureliajs/ssr-playground
 * Enterprise Aurelia 2 + Hono SSR & .aux Playground Dashboard
 * Compact UI/UX, Independent Resizable Panes, Offline Prism Syntax Highlighting, and Per-Example Profiling
 */

import type { ExampleMeta } from '../examples/loader';

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

  <!-- Local Offline Prism Syntax Highlighting Assets -->
  <link rel="stylesheet" href="/assets/prism.css">
  <script src="/assets/prism.js"></script>

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
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
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

    /* Gutter & Line Numbers Column */
    #editorLineNumbers {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
      line-height: 22px !important;
      font-size: 11px !important;
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace !important;
    }
    #editorLineNumbers > div {
      height: 22px !important;
      line-height: 22px !important;
      box-sizing: border-box !important;
    }

    /* In-Editor Highlight Overlay Layer and Textarea matching 1:1 */
    #editorHighlightPre,
    #codeEditorInput {
      margin: 0 !important;
      padding: 8px 12px !important;
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace !important;
      font-size: 12px !important;
      line-height: 22px !important;
      letter-spacing: 0 !important;
      tab-size: 2 !important;
      -moz-tab-size: 2 !important;
      white-space: pre !important;
      word-wrap: normal !important;
      word-break: normal !important;
      box-sizing: border-box !important;
      border: 0 !important;
    }
    #editorHighlightPre {
      background: transparent !important;
      pointer-events: none !important;
      overflow: hidden !important;
      z-index: 0;
    }
    #editorHighlightPre code,
    #editorHighlightCode {
      font-family: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      letter-spacing: inherit !important;
      tab-size: inherit !important;
      -moz-tab-size: inherit !important;
      white-space: inherit !important;
      word-wrap: inherit !important;
      word-break: inherit !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      display: inline-block !important;
      min-width: 100% !important;
    }
    #codeEditorInput {
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      caret-color: #ffffff !important;
      overflow: auto !important;
      outline: none !important;
      z-index: 20;
    }

    /* Dropdown Accordion & Focus Ring Precision */
    #exampleDropdownMenu,
    #exampleDropdownMenu * {
      outline: none !important;
    }
    #dropdownExamplesList button {
      outline: none !important;
      position: relative;
    }
    #dropdownExamplesList button:focus,
    #dropdownExamplesList button:focus-visible {
      outline: none !important;
      box-shadow: inset 0 0 0 1.5px rgba(255, 62, 0, 0.85) !important;
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
        <button id="menuDropdownBtn" class="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-hover hover:bg-border text-gray-200 border border-border text-[11px] font-medium transition outline-none focus-visible:ring-1 focus-visible:ring-accent/70">
          <svg class="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clip-rule="evenodd"/>
          </svg>
          <span id="currentExampleLabel">Loading Examples...</span>
          <svg class="size-2.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Dropdown Menu List (Inset padding and outline-none to avoid clipped focus rings) -->
        <div id="exampleDropdownMenu" class="hidden absolute top-full left-0 mt-1 w-72 max-h-[80vh] overflow-y-auto bg-[#161b22] border border-border rounded-lg shadow-2xl z-50 p-2 focus:outline-none">
          <div id="dropdownExamplesList" class="space-y-1">
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

      <a href="https://github.com/sandikodev/hono-aurelia" target="_blank" class="text-[11px] text-gray-400 hover:text-gray-200 transition pl-1">
        GitHub ↗
      </a>
    </div>
  </header>

  <!-- Main Split Pane Interface (Fully Resizable) -->
  <div id="mainContainer" class="flex-1 flex overflow-hidden relative">

    <!-- LEFT PANEL: Dynamic Multi-File Editor -->
    <div id="leftEditorPane" class="w-1/2 flex flex-col bg-background overflow-hidden min-w-[220px]">
      
      <!-- Dynamic File Tabs Bar (Height 32px) -->
      <div class="h-8 border-b border-border bg-surface flex items-center justify-between px-0 select-none flex-shrink-0">
        <div class="flex items-center space-x-0" id="editorTabsBar">
          <!-- Dynamically populated files for the active example -->
        </div>

        <div class="flex items-center space-x-2 text-[11px] text-gray-400 pr-2">
          <span class="font-mono text-gray-500" id="componentModelBadge">Aurelia 2 Convention</span>
        </div>
      </div>

      <!-- Editor Canvas: Line Numbers Gutter + Dedicated Code Area Container -->
      <div class="flex-1 flex overflow-hidden relative" id="editorCanvasWrapper">
        <!-- Line Numbers Column (Gutter) -->
        <div id="editorLineNumbers" class="w-11 bg-surface/50 border-r border-border/40 text-right pr-2 font-mono text-[11px] text-gray-500 select-none overflow-hidden flex-shrink-0">
        </div>

        <!-- Code Editor Body Container (Houses Trace Overlay, Highlight Pre, and Textarea) -->
        <div class="flex-1 relative overflow-hidden h-full" id="editorBodyContainer">
          <!-- Clean Line Highlight Overlay -->
          <div id="editorTraceOverlay" class="pointer-events-none absolute inset-0 overflow-hidden z-10">
            <div id="traceHighlightBar" class="hidden editor-line-highlight"></div>
          </div>

          <!-- Syntax Highlighting Background Layer (Prism Tokenized) -->
          <pre id="editorHighlightPre" class="pointer-events-none absolute inset-0 font-mono text-xs leading-[22px] overflow-hidden whitespace-pre bg-transparent text-gray-200 z-0 m-0"><code id="editorHighlightCode"></code></pre>

          <!-- Interactive Textarea Layer (Transparent text, visible caret) -->
          <textarea id="codeEditorInput" spellcheck="false" class="absolute inset-0 font-mono text-xs leading-[22px] resize-none focus:outline-none overflow-auto whitespace-pre bg-transparent text-transparent caret-white selection:bg-accent/30 z-20"></textarea>
        </div>
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

    <!-- RIGHT PANEL: Multi-Tab Outputs -->
    <div id="rightOutputPane" class="flex-1 flex flex-col bg-background overflow-hidden min-w-[220px]">
      
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

        <!-- Tab 1: Result (Live Preview + Console Drawer ONLY ON RESULT TAB) -->
        <div id="view-result" class="output-view flex-1 flex flex-col relative overflow-hidden bg-white">
          <div class="flex-1 relative overflow-hidden bg-white">
            <iframe id="previewIframe" class="w-full h-full border-0"></iframe>
          </div>

          <!-- Resizable Divider for Console Drawer -->
          <div id="consoleSplitDivider" class="split-divider-v" title="Drag to resize console drawer"></div>

          <!-- Console Drawer (Attached exclusively to Result Tab) -->
          <div id="consoleDrawer" class="border-t border-border bg-surface select-none flex flex-col flex-shrink-0 overflow-hidden" style="height: 160px;">
            <!-- Clickable Header Bar (Height 28px) -->
            <div id="consoleHeader" class="h-7 px-2.5 flex items-center justify-between cursor-pointer hover:bg-hover transition flex-shrink-0" title="Click to minimize / maximize console panel">
              <div class="flex items-center space-x-1.5">
                <span id="consoleArrow" class="text-[9px] text-gray-500 font-mono select-none">▼</span>
                <span class="text-[11px] font-mono font-semibold text-gray-300 flex items-center space-x-1.5">
                  <span>CONSOLE</span>
                  <span id="consoleBadge" class="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] rounded-full">0</span>
                </span>
              </div>
              <button id="clearConsoleBtn" class="text-[10px] font-mono text-gray-400 hover:text-white transition px-1.5 py-0.5 rounded hover:bg-hover" title="Clear console output">
                CLEAR
              </button>
            </div>
            <div id="consoleLogsStream" class="flex-1 p-2 font-mono text-[11px] overflow-y-auto space-y-0.5 text-gray-300 select-text">
              <div class="text-gray-500 italic text-[10px]">[Playground Ready] Event triggers, diagnostics, and console.log appear here...</div>
            </div>
          </div>
        </div>

        <!-- Tab 2: JS Output with Resizable Compiler Options Drawer -->
        <div id="view-js" class="output-view hidden flex-1 flex flex-col relative overflow-hidden bg-surface/30">
          <pre class="flex-1 p-3 font-mono text-[11px] overflow-auto text-gray-200 leading-5 select-text whitespace-pre-wrap m-0"><code id="compiledJsCode" class="language-typescript">/* Select a component to see its compiled code */</code></pre>

          <!-- Resizable Divider for Compiler Options -->
          <div id="compilerOptionsSplitter" class="split-divider-v" title="Drag to resize compiler options panel"></div>

          <!-- Resizable Compiler & SSR Options Drawer (Default Maximized, Click Header to Minimize/Maximize) -->
          <div id="compilerOptionsDrawer" class="border-t border-border bg-surface select-none flex flex-col flex-shrink-0 overflow-hidden" style="height: 160px;">
            <!-- Clickable Header Bar (Height 28px) -->
            <div id="compilerOptionsHeader" class="h-7 px-2.5 flex items-center justify-between cursor-pointer hover:bg-hover transition flex-shrink-0" title="Click to minimize / maximize options panel">
              <div class="flex items-center space-x-1.5">
                <span id="compilerOptionsArrow" class="text-[9px] text-gray-500 font-mono select-none">▼</span>
                <span class="text-[11px] font-mono font-semibold text-gray-300 flex items-center space-x-1.5">
                  <span>⚙</span>
                  <span>COMPILER & SSR OPTIONS</span>
                </span>
              </div>
              <span class="text-[10px] text-gray-500 font-mono">Per-Example Profiling Active</span>
            </div>

            <!-- Expandable Options Body Container -->
            <div id="compilerOptionsBody" class="flex-1 px-2.5 pb-2 pt-0 overflow-hidden">
              <div class="font-mono text-[11px] text-gray-300 space-y-0.5 bg-background p-2 rounded border border-border/60 overflow-hidden">
                <div class="text-gray-400 text-[10px] select-none">result = await renderAurelia(component, {</div>
                
                <div class="pl-3 py-0.5 flex items-center space-x-5">
                  <span class="text-gray-400 text-[10px] select-none">mode:</span>
                  <label class="flex items-center space-x-1.5 cursor-pointer">
                    <input type="radio" name="opt-runtime-mode" value="ssr" checked class="text-accent focus:ring-0">
                    <span class="text-emerald-400 font-semibold text-[11px]">"ssr"</span>
                  </label>
                  <label class="flex items-center space-x-1.5 cursor-pointer">
                    <input type="radio" name="opt-runtime-mode" value="client" class="text-accent focus:ring-0">
                    <span class="text-gray-400 text-[11px]">"client"</span>
                  </label>
                  <label class="flex items-center space-x-1.5 cursor-pointer">
                    <input type="radio" name="opt-runtime-mode" value="resumable" class="text-accent focus:ring-0">
                    <span class="text-purple-400 text-[11px]">"resumable"</span>
                  </label>
                </div>

                <div class="pl-3 py-0.5 flex items-center space-x-5">
                  <span class="text-gray-400 text-[10px] select-none">strategy:</span>
                  <label class="flex items-center space-x-1.5 cursor-pointer">
                    <input type="radio" name="opt-strategy" value="hydrate" checked class="text-accent focus:ring-0">
                    <span class="text-white text-[11px]">"hydrate"</span>
                  </label>
                  <label class="flex items-center space-x-1.5 cursor-pointer">
                    <input type="radio" name="opt-strategy" value="static" class="text-accent focus:ring-0">
                    <span class="text-gray-400 text-[11px]">"static (zero-js)"</span>
                  </label>
                </div>

                <div class="pl-3 py-0.5 flex items-center space-x-5">
                  <span class="text-gray-400 text-[10px] select-none">whitelistAudit:</span>
                  <label class="flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="opt-whitelist-audit" checked class="text-accent focus:ring-0 rounded">
                    <span class="text-cyan-400 text-[11px]">true</span>
                  </label>
                </div>

                <div class="text-gray-400 text-[10px] select-none">});</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: SSR HTML Output (Prism Syntax Highlighted) -->
        <div id="view-html" class="output-view hidden flex-1 flex flex-col p-3 bg-surface/30 overflow-auto font-mono text-xs select-text">
          <div class="mb-2 text-xs font-semibold text-gray-400 flex items-center justify-between">
            <span>Pre-rendered Server HTML (with Aurelia hydration markers)</span>
            <button id="copyHtmlBtn" class="px-2 py-0.5 rounded bg-hover text-gray-300 hover:text-white border border-border">Copy HTML</button>
          </div>
          <pre class="flex-1 text-gray-200 bg-background p-3 rounded border border-border overflow-auto whitespace-pre-wrap leading-5 m-0"><code id="rawServerHtmlCode" class="language-markup"></code></pre>
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
    const linterStatusPill = document.getElementById('linterStatusPill');
    const linterStatusIcon = document.getElementById('linterStatusIcon');
    const linterStatusText = document.getElementById('linterStatusText');

    // Panes & Splitters
    const mainContainer = document.getElementById('mainContainer');
    const leftEditorPane = document.getElementById('leftEditorPane');
    const rightOutputPane = document.getElementById('rightOutputPane');
    const hSplitDivider = document.getElementById('hSplitDivider');
    const consoleSplitDivider = document.getElementById('consoleSplitDivider');
    const compilerOptionsSplitter = document.getElementById('compilerOptionsSplitter');
    const consoleDrawer = document.getElementById('consoleDrawer');
    const compilerOptionsDrawer = document.getElementById('compilerOptionsDrawer');
    const compilerOptionsHeader = document.getElementById('compilerOptionsHeader');
    const compilerOptionsArrow = document.getElementById('compilerOptionsArrow');
    const compilerOptionsBody = document.getElementById('compilerOptionsBody');

    // ----------------------------------------------------
    // RESIZABLE SPLIT PANES LOGIC (Smooth & Zero Lag)
    // ----------------------------------------------------
    let activeDrag = null;

    hSplitDivider.addEventListener('mousedown', (e) => {
      activeDrag = 'H';
      hSplitDivider.classList.add('active');
      previewIframe.style.pointerEvents = 'none';
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    consoleSplitDivider.addEventListener('mousedown', (e) => {
      activeDrag = 'CONSOLE';
      consoleSplitDivider.classList.add('active');
      previewIframe.style.pointerEvents = 'none';
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });

    compilerOptionsSplitter.addEventListener('mousedown', (e) => {
      activeDrag = 'OPTIONS';
      compilerOptionsSplitter.classList.add('active');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!activeDrag) return;

      if (activeDrag === 'H') {
        const containerRect = mainContainer.getBoundingClientRect();
        const offsetX = e.clientX - containerRect.left;
        let percentage = (offsetX / containerRect.width) * 100;
        percentage = Math.max(20, Math.min(80, percentage));
        leftEditorPane.style.width = percentage + '%';
        rightOutputPane.style.width = (100 - percentage) + '%';
      } else if (activeDrag === 'CONSOLE') {
        const resultView = document.getElementById('view-result');
        const viewRect = resultView.getBoundingClientRect();
        const newHeight = viewRect.bottom - e.clientY;
        const clampedHeight = Math.max(28, Math.min(viewRect.height - 80, newHeight));
        if (clampedHeight <= 36) {
          isConsoleCollapsed = true;
          consoleDrawer.style.height = '28px';
          consoleArrow.textContent = '▲';
          consoleLogsStream.classList.add('hidden');
        } else {
          isConsoleCollapsed = false;
          lastConsoleHeight = clampedHeight;
          consoleDrawer.style.height = clampedHeight + 'px';
          consoleArrow.textContent = '▼';
          consoleLogsStream.classList.remove('hidden');
        }
      } else if (activeDrag === 'OPTIONS') {
        const jsView = document.getElementById('view-js');
        const viewRect = jsView.getBoundingClientRect();
        const newHeight = viewRect.bottom - e.clientY;
        const clampedHeight = Math.max(28, Math.min(viewRect.height - 80, newHeight));
        if (clampedHeight <= 36) {
          isOptionsCollapsed = true;
          compilerOptionsDrawer.style.height = '28px';
          compilerOptionsArrow.textContent = '▲';
          compilerOptionsBody.classList.add('hidden');
        } else {
          isOptionsCollapsed = false;
          lastOptionsHeight = clampedHeight;
          compilerOptionsDrawer.style.height = clampedHeight + 'px';
          compilerOptionsArrow.textContent = '▼';
          compilerOptionsBody.classList.remove('hidden');
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (activeDrag) {
        activeDrag = null;
        hSplitDivider.classList.remove('active');
        consoleSplitDivider.classList.remove('active');
        compilerOptionsSplitter.classList.remove('active');
        previewIframe.style.pointerEvents = 'auto';
        document.body.style.cursor = 'default';
      }
    });

    // ----------------------------------------------------
    // IN-EDITOR SYNTAX HIGHLIGHTING (Using Prism Directly)
    // Zero String Corruption & Pixel-Perfect Alignment
    // ----------------------------------------------------
    function renderEditorHighlight() {
      const code = codeEditorInput.value;
      const ext = activeFileName.split('.').pop() || '';

      if (!window.Prism) {
        editorHighlightCode.textContent = code;
        return;
      }

      let lang = 'markup';
      let grammar = Prism.languages.markup;

      if (ext === 'aux') {
        lang = 'aux';
        grammar = Prism.languages.aux || Prism.languages.markup;
      } else if (ext === 'ts') {
        lang = 'typescript';
        grammar = Prism.languages.typescript || Prism.languages.javascript;
      } else if (ext === 'json') {
        lang = 'json';
        grammar = Prism.languages.json;
      } else if (ext === 'html') {
        lang = 'aurelia';
        grammar = Prism.languages.aurelia || Prism.languages.markup;
      }

      // Ensure trailing newline has space so pre tag allocates height for empty trailing line
      const textToHighlight = code.endsWith(String.fromCharCode(10)) ? code + ' ' : code;
      editorHighlightCode.innerHTML = Prism.highlight(textToHighlight, grammar, lang);
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
        catDiv.setAttribute('data-category', categoryName);
        
        const catHeader = document.createElement('button');
        catHeader.type = 'button';
        catHeader.className = 'w-full px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 select-none flex items-center justify-between hover:bg-hover hover:text-white rounded-md transition outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent';
        catHeader.innerHTML = '<div class="flex items-center space-x-1.5"><span data-chevron class="text-[9px] text-gray-500 font-mono inline-block w-2 text-center">›</span><span>' + categoryName + '</span></div><span class="text-[9px] text-gray-500 font-mono">' + items.length + '</span>';
        
        const itemsContainer = document.createElement('div');
        itemsContainer.setAttribute('data-items', 'true');
        itemsContainer.className = 'py-0.5 space-y-0.5 hidden'; // Collapsed by default!

        catHeader.addEventListener('click', (e) => {
          e.stopPropagation();
          const willOpen = itemsContainer.classList.contains('hidden');
          
          // Accordion single-expansion: close all other category menus
          document.querySelectorAll('#dropdownExamplesList [data-items]').forEach(el => {
            el.classList.add('hidden');
          });
          document.querySelectorAll('#dropdownExamplesList [data-chevron]').forEach(el => {
            el.textContent = '›';
          });
          
          if (willOpen) {
            itemsContainer.classList.remove('hidden');
            const chev = catHeader.querySelector('[data-chevron]');
            if (chev) chev.textContent = '▾';
          }
        });

        items.forEach(it => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'w-full text-left pl-6 pr-2.5 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-hover rounded-md transition block outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent';
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

    // Auto-expand ONLY the category of the open example, collapse all others
    function syncActiveCategoryExpansion(targetCategory) {
      document.querySelectorAll('#dropdownExamplesList [data-category]').forEach(catEl => {
        const catName = catEl.getAttribute('data-category');
        const itemsEl = catEl.querySelector('[data-items]');
        const chevronEl = catEl.querySelector('[data-chevron]');
        if (catName === targetCategory) {
          if (itemsEl) itemsEl.classList.remove('hidden');
          if (chevronEl) chevronEl.textContent = '▾';
        } else {
          if (itemsEl) itemsEl.classList.add('hidden');
          if (chevronEl) chevronEl.textContent = '›';
        }
      });
    }

    // Load an Example with its OWN profiling options and sync URL query param
    function loadExample(id, updateUrl = true, shouldCompile = true) {
      if (!EXAMPLES[id]) return;
      activeExampleId = id;
      const ex = EXAMPLES[id];
      currentExampleLabel.textContent = ex.title;

      // Update URL search query parameter ergonomically (?example=<id>)
      if (updateUrl && window.history && window.history.pushState) {
        const url = new URL(window.location.href);
        if (url.searchParams.get('example') !== id) {
          url.searchParams.set('example', id);
          window.history.pushState({ example: id }, '', url.toString());
        }
      }

      // Auto-expand ONLY the category of the open example, collapse all others
      syncActiveCategoryExpansion(ex.category);

      document.querySelectorAll('#dropdownExamplesList button[data-id]').forEach(btn => {
        if (btn.getAttribute('data-id') === id) {
          btn.className = 'w-full text-left pl-6 pr-2.5 py-1 text-[11px] text-accent font-medium bg-accent/15 rounded-md transition block outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent';
        } else {
          btn.className = 'w-full text-left pl-6 pr-2.5 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-hover rounded-md transition block outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent';
        }
      });

      if (id.includes('aux') || (ex.defaultFile && ex.defaultFile.endsWith('.aux'))) {
        componentModelBadge.textContent = 'Aurelia in HTML (.aux SFC)';
        componentModelBadge.className = 'font-mono text-cyan-400';
      } else if (id.includes('resumable')) {
        componentModelBadge.textContent = 'Resumable Hydration (Zero-JS)';
        componentModelBadge.className = 'font-mono text-purple-400';
      } else {
        componentModelBadge.textContent = (ex.category || 'Aurelia 2') + ' Convention';
        componentModelBadge.className = 'font-mono text-gray-400';
      }

      // Restore THIS example's own compiler options profiling!
      const opts = ex.options || { mode: 'ssr', strategy: 'hydrate', whitelistAudit: true };
      const modeRadio = document.querySelector('input[name="opt-runtime-mode"][value="' + opts.mode + '"]');
      if (modeRadio) modeRadio.checked = true;

      const stratRadio = document.querySelector('input[name="opt-strategy"][value="' + opts.strategy + '"]');
      if (stratRadio) stratRadio.checked = true;

      if (optWhitelistAudit) {
        optWhitelistAudit.checked = Boolean(opts.whitelistAudit);
      }

      renderFileTabs(ex);
      switchFile(ex.defaultFile || Object.keys(ex.files)[0]);
      if (shouldCompile) {
        compileAndRender();
      }
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

      codeEditorInput.scrollTop = 0;
      codeEditorInput.scrollLeft = 0;
      editorHighlightPre.scrollTop = 0;
      editorHighlightPre.scrollLeft = 0;
      editorLineNumbers.scrollTop = 0;

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
      const mode = runtimeModeEl ? runtimeModeEl.value : (ex.options?.mode || 'ssr');
      const strategy = strategyEl ? strategyEl.value : (ex.options?.strategy || 'hydrate');
      const whitelistAudit = optWhitelistAudit ? optWhitelistAudit.checked : (ex.options?.whitelistAudit ?? true);

      // Persist per-example options
      ex.options = { mode, strategy, whitelistAudit };

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
        if (typeof document === 'undefined' || !document.querySelector) return;
        currentDiagnostics = data.diagnostics || [];
        updateLinterUI(currentDiagnostics);

        if (!data.success && data.error) {
          logToConsole('error', 'Compilation Error: ' + data.error);
        }

        renderCompilationOutputs(data, ex);
        editorLiveIndicator.textContent = '● Live Synchronized';
        editorLiveIndicator.className = 'text-emerald-400';
      } catch (err) {
        if (typeof document === 'undefined' || !document.querySelector) return;
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

        diagnostics.forEach(d => {
          logToConsole(d.severity, '[' + d.source + '] ' + d.file + ':' + d.line + ':' + d.col + ' - ' + d.message);
        });
      } else {
        linterStatusIcon.textContent = '✔';
        linterStatusText.textContent = '0 errors, 0 warnings';
        linterStatusPill.className = 'flex items-center space-x-1 text-emerald-400 hover:underline cursor-pointer';
      }

      updateLineNumbers();
    }

    function renderCompilationOutputs(data, ex) {
      // 1. Live Preview Iframe
      if (data.htmlDocument) {
        previewIframe.srcdoc = data.htmlDocument;
      }

      // 2. JS Output (Syntax Highlighted via Prism)
      if (data.compiledJs && window.Prism) {
        compiledJsCode.innerHTML = Prism.highlight(data.compiledJs, Prism.languages.typescript, 'typescript');
      } else if (data.compiledJs) {
        compiledJsCode.textContent = data.compiledJs;
      }

      // 3. SSR HTML Output (Syntax Highlighted via Prism)
      if (data.rawHtml && window.Prism) {
        rawServerHtmlCode.innerHTML = Prism.highlight(data.rawHtml, Prism.languages.markup, 'markup');
      } else if (data.rawHtml) {
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

    // Dropdown toggle: auto-expand ONLY active example category every time menu is opened
    document.getElementById('menuDropdownBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = exampleDropdownMenu.classList.contains('hidden');
      exampleDropdownMenu.classList.toggle('hidden');
      if (willOpen && activeExampleId && EXAMPLES[activeExampleId]) {
        syncActiveCategoryExpansion(EXAMPLES[activeExampleId].category);
      }
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

    // Compiler options reactive listeners (saves per-example options)
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

    // Console drawer minimize / maximize toggle (on Result view)
    const consoleHeader = document.getElementById('consoleHeader');
    const consoleArrow = document.getElementById('consoleArrow');
    let isConsoleCollapsed = false;
    let lastConsoleHeight = 160;

    consoleHeader.addEventListener('click', (e) => {
      if (e.target && e.target.closest('#clearConsoleBtn')) return;
      isConsoleCollapsed = !isConsoleCollapsed;
      if (isConsoleCollapsed) {
        lastConsoleHeight = Math.max(140, consoleDrawer.offsetHeight);
        consoleDrawer.style.height = '28px';
        consoleArrow.textContent = '▲';
        consoleLogsStream.classList.add('hidden');
      } else {
        consoleDrawer.style.height = (lastConsoleHeight || 160) + 'px';
        consoleArrow.textContent = '▼';
        consoleLogsStream.classList.remove('hidden');
      }
    });

    // Compiler & SSR Options Drawer minimize / maximize toggle (on JS Output view)
    let isOptionsCollapsed = false;
    let lastOptionsHeight = 160;

    compilerOptionsHeader.addEventListener('click', () => {
      isOptionsCollapsed = !isOptionsCollapsed;
      if (isOptionsCollapsed) {
        lastOptionsHeight = Math.max(140, compilerOptionsDrawer.offsetHeight);
        compilerOptionsDrawer.style.height = '28px';
        compilerOptionsArrow.textContent = '▲';
        compilerOptionsBody.classList.add('hidden');
      } else {
        compilerOptionsDrawer.style.height = (lastOptionsHeight || 160) + 'px';
        compilerOptionsArrow.textContent = '▼';
        compilerOptionsBody.classList.remove('hidden');
      }
    });

    document.getElementById('clearConsoleBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      consoleLogsStream.innerHTML = '';
      consoleLogCount = 0;
      consoleBadge.textContent = '0';
    });

    document.getElementById('linterStatusPill').addEventListener('click', () => {
      // Switch to Result view if not already
      document.querySelector('.output-tab[data-view="result"]').click();
      if (isConsoleCollapsed) {
        isConsoleCollapsed = false;
        consoleDrawer.style.height = (lastConsoleHeight || 160) + 'px';
        consoleArrow.textContent = '▼';
        consoleLogsStream.classList.remove('hidden');
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

    // Initial Bootstrap with URL Search Parameter Support (?example=<id>)
    initDropdown();

    const urlParams = new URLSearchParams(window.location.search);
    const requestedExample = urlParams.get('example') || urlParams.get('fixture');
    let initialExampleId = 'hello-world';
    if (requestedExample && EXAMPLES[requestedExample]) {
      initialExampleId = requestedExample;
    } else if (EXAMPLES['hello-world']) {
      initialExampleId = 'hello-world';
    } else {
      initialExampleId = Object.keys(EXAMPLES)[0] || 'counter-card';
    }
    loadExample(initialExampleId, true);

    // Ergonomic Browser Back / Forward History Navigation
    window.addEventListener('popstate', (event) => {
      const currentParams = new URLSearchParams(window.location.search);
      const targetId = (event.state && event.state.example) || currentParams.get('example') || 'hello-world';
      if (EXAMPLES[targetId] && targetId !== activeExampleId) {
        loadExample(targetId, false);
      }
    });
  </script>
</body>
</html>
`;
}
