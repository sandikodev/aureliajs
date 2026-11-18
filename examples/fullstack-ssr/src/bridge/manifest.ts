import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

export interface FrameworkRecord {
  id: string;
  name: string;
  trigger: string;
  sourceFile: string;
  compiler: string;
  chunkUrl: string;
  rawBytes: number;
  gzipBytes: number;
  sourceCode: string;
  compiledPreview: string;
  sourceHighlighted?: string;
  compiledHighlighted?: string;
}

export interface BridgeManifest {
  generatedAt: string;
  islandLoader: { chunkUrl: string; rawBytes: number; gzipBytes: number };
  bridgeHost: { chunkUrl: string; rawBytes: number; gzipBytes: number };
  frameworks: FrameworkRecord[];
}

const DEFAULT_FALLBACK_MANIFEST: BridgeManifest = {
  generatedAt: new Date().toISOString(),
  bridgeHost: { chunkUrl: '/public/bridge/app.js', rawBytes: 0, gzipBytes: 0 },
  islandLoader: { chunkUrl: '/public/island-loader.js', rawBytes: 0, gzipBytes: 0 },
  frameworks: [
    { id: 'react', name: 'React 19', trigger: 'load (eager)', sourceFile: 'src/bridge/frameworks/ReactWidget.tsx', compiler: 'Bun TSX', chunkUrl: '/public/bridge/chunks/react-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'vue', name: 'Vue 3.5 SFC', trigger: 'load (eager)', sourceFile: 'src/bridge/frameworks/VueWidget.vue', compiler: '@vue/compiler-sfc', chunkUrl: '/public/bridge/chunks/vue-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'svelte', name: 'Svelte 5 Runes', trigger: 'island="idle"', sourceFile: 'src/bridge/frameworks/SvelteWidget.svelte', compiler: 'svelte/compiler', chunkUrl: '/public/bridge/chunks/svelte-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'preact', name: 'Preact 11', trigger: 'island="interaction"', sourceFile: 'src/bridge/frameworks/Widget.preact.tsx', compiler: 'Bun TSX', chunkUrl: '/public/bridge/chunks/preact-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'solid', name: 'SolidJS 1.9', trigger: 'island="visible"', sourceFile: 'src/bridge/frameworks/Widget.solid.tsx', compiler: 'Babel SolidJS', chunkUrl: '/public/bridge/chunks/solid-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'qwik', name: 'Qwik 1.20', trigger: 'island="visible"', sourceFile: 'src/bridge/frameworks/Widget.qwik.tsx', compiler: 'Bun TSX', chunkUrl: '/public/bridge/chunks/qwik-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'lit', name: 'Lit 3', trigger: 'island="visible"', sourceFile: 'src/bridge/frameworks/Widget.lit.ts', compiler: 'Bun TS', chunkUrl: '/public/bridge/chunks/lit-widget.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'htmx', name: 'HTMX 2', trigger: 'au-htmx attribute', sourceFile: 'src/bridge/frameworks/htmx.html', compiler: 'Zero Compiler (Native HTML Hypermedia)', chunkUrl: '/public/bridge/chunks/htmx-runtime.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
    { id: 'aurelia-aux', name: 'Aurelia 2 .aux', trigger: 'island="visible"', sourceFile: 'src/components/pricing-island.aux', compiler: '@aureliajs/vite-plugin-aux', chunkUrl: '/public/islands/pricing.js', rawBytes: 0, gzipBytes: 0, sourceCode: '', compiledPreview: '' },
  ],
};

export function readBridgeManifest(): BridgeManifest {
  const manifestPath = resolve(import.meta.dir, '../../public/bridge/manifest.json');
  if (!existsSync(manifestPath)) return DEFAULT_FALLBACK_MANIFEST;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as BridgeManifest;
  } catch {
    return DEFAULT_FALLBACK_MANIFEST;
  }
}
