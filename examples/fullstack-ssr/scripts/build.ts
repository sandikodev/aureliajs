/**
 * Modern Native Bun Build Script for Aurelia 2 SSR + Polyglot Bridge
 *
 * - Zero-copy asynchronous kernel I/O via `Bun.file` and `Bun.write`
 * - In-memory virtual entrypoints via `onResolve` / `onLoad` (0 temporary disk files)
 * - Ultra-fast multi-core parallel bundling via `Promise.all`
 * - Native compression via `Bun.gzipSync`
 * - 100% typed with `bun-types` (zero `declare const Bun` or `(Bun as any)` hacks)
 */

import { resolve } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import type { BunPlugin } from 'bun';
import { compile as compileSvelte } from 'svelte/compiler';
import { parse as parseVueSfc, compileScript as compileVueScript } from '@vue/compiler-sfc';
import * as babel from '@babel/core';
import { auxBunPlugin, compileAux, parseAux } from '@aureliajs/vite-plugin-aux';
import { highlightCode } from '../src/bridge/highlighter.ts';

const ROOT = resolve(import.meta.dir, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const ISLANDS_DIR = resolve(PUBLIC_DIR, 'islands');
const BRIDGE_DIR = resolve(PUBLIC_DIR, 'bridge');
const BRIDGE_CHUNKS_DIR = resolve(BRIDGE_DIR, 'chunks');

export interface FrameworkArtifactRecord {
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

interface ChunkResult {
  rawBytes: number;
  gzipBytes: number;
  code: string;
}

interface FrameworkSpec {
  id: string;
  name: string;
  trigger: string;
  sourceFile: string;
  chunkFile: string;
  compiler: string;
  plugins?: BunPlugin[];
}

const compiledSnapshots = new Map<string, string>();

/**
 * Vue 3 SFC Compiler Plugin for Bun
 */
function vueSfcBunPlugin(): BunPlugin {
  return {
    name: 'vue-sfc-bun',
    setup(builder) {
      builder.onLoad({ filter: /\.vue$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const { descriptor } = parseVueSfc(source, { filename: args.path });
        const compiled = compileVueScript(descriptor, {
          id: 'vue-bridge-widget',
          inlineTemplate: true,
        });
        compiledSnapshots.set('vue', compiled.content);
        return { contents: compiled.content, loader: 'ts' };
      });
    },
  };
}

/**
 * Svelte 5 Runes Compiler Plugin for Bun
 */
function svelte5BunPlugin(): BunPlugin {
  return {
    name: 'svelte5-bun',
    setup(builder) {
      builder.onLoad({ filter: /\.svelte$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const compiled = compileSvelte(source, {
          filename: args.path,
          generate: 'client',
          runes: true,
        });
        compiledSnapshots.set('svelte', compiled.js.code);
        return { contents: compiled.js.code, loader: 'js' };
      });
    },
  };
}

/**
 * SolidJS Babel Compiler Plugin for Bun
 */
function solidJsBunPlugin(): BunPlugin {
  return {
    name: 'solidjs-babel-bun',
    setup(builder) {
      builder.onLoad({ filter: /\.solid\.tsx$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const transformed = babel.transformSync(source, {
          filename: args.path,
          presets: ['@babel/preset-typescript', 'babel-preset-solid'],
        });
        const code = transformed?.code ?? '';
        compiledSnapshots.set('solid', code);
        return { contents: code, loader: 'js' };
      });
    },
  };
}

/**
 * Qwik Optimizer Plugin for Bun
 */
function qwikBunPlugin(optimizer: {
  transformModulesSync: (opts: unknown) => { modules: Array<{ code: string }> };
}): BunPlugin {
  return {
    name: 'qwik-optimizer-bun',
    setup(builder) {
      builder.onLoad({ filter: /\.qwik\.tsx$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const res = optimizer.transformModulesSync({
          srcDir: resolve(ROOT, 'src/bridge/frameworks'),
          rootDir: ROOT,
          mode: 'prod',
          entryStrategy: { type: 'inline' },
          transpileTs: true,
          transpileJsx: true,
          input: [{ path: args.path, code: source }],
        });
        const code = res.modules[0]?.code ?? source;
        compiledSnapshots.set('qwik', code);
        return { contents: code, loader: 'js' };
      });
    },
  };
}

/**
 * In-Memory Virtual Entry Plugin for Bun.build
 * Serves ephemeral bridge entry points in-memory (Zero disk writes to .cache)
 */
function createVirtualEntryPlugin(virtualModules: Map<string, string>): BunPlugin {
  return {
    name: 'virtual-bridge-entry-plugin',
    setup(build) {
      build.onResolve({ filter: /^virtual:bridge-entry\// }, (args) => ({
        path: args.path,
        namespace: 'virtual-bridge-entry',
      }));

      build.onResolve({ filter: /.*/, namespace: 'virtual-bridge-entry' }, async (args) => {
        const resolved = await build.resolve(args.path, { resolveDir: ROOT });
        return { path: resolved.path };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual-bridge-entry' }, (args) => {
        const key = args.path.replace(/^virtual:bridge-entry\//, '');
        const contents = virtualModules.get(key);
        if (contents === undefined) {
          throw new Error(`[virtual-bridge-entry] Module not found: ${args.path}`);
        }
        return { contents, loader: 'ts' };
      });
    },
  };
}

/**
 * Generates synthetic in-memory bridge adapter entrypoint code
 */
function getVirtualEntrySource(frameworkId: string, sourcePath: string): string {
  switch (frameworkId) {
    case 'react':
      return [
        `import * as React from 'react';`,
        `import * as ReactDOM from 'react-dom/client';`,
        `import { createReactAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createReactAdapter(React, ReactDOM);`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'vue':
      return [
        `import * as Vue from 'vue';`,
        `import { createVueAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createVueAdapter(Vue);`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'svelte':
      return [
        `import * as Svelte from 'svelte';`,
        `import { createSvelteAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createSvelteAdapter(Svelte);`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'preact':
      return [
        `import * as Preact from 'preact';`,
        `import { createPreactAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createPreactAdapter(Preact);`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'solid':
      return [
        `import * as SolidWeb from 'solid-js/web';`,
        `import * as SolidCore from 'solid-js';`,
        `import { createSolidAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createSolidAdapter(SolidWeb, SolidCore);`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'qwik':
      return [
        `import * as Qwik from '@builder.io/qwik';`,
        `import { createQwikAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createQwikAdapter(Qwik);`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'lit':
      return [
        `import { createLitAdapter } from '@aureliajs/bridge/adapters';`,
        `import Component from '${sourcePath}';`,
        `export const adapter = createLitAdapter();`,
        `export const component = Component;`,
        `export default Component;`,
      ].join('\n');
    case 'htmx':
      return [
        `import htmx from 'htmx.org';`,
        `htmx.config.allowEval = false;`,
        `htmx.config.selfRequestsOnly = true;`,
        `export default htmx;`,
      ].join('\n');
    default:
      throw new Error(`Unknown framework ID for virtual entry: ${frameworkId}`);
  }
}

/**
 * Universal Bun.build wrapper returning raw bytes, gzip bytes, and code string
 */
async function buildChunk(options: {
  entrypoint: string;
  outdir: string;
  naming: string;
  plugins?: BunPlugin[];
  external?: string[];
  minify?: boolean;
}): Promise<ChunkResult> {
  const result = await Bun.build({
    entrypoints: [options.entrypoint],
    root: ROOT,
    outdir: options.outdir,
    naming: options.naming,
    plugins: options.plugins ?? [],
    loader: { '.html': 'text' },
    external: options.external ?? [],
    target: 'browser',
    conditions: ['browser', 'module', 'import', 'default'],
    format: 'esm',
    minify: options.minify ?? true,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  if (!result.success) {
    console.error(`❌ Bun.build failed for ${options.naming}:`, result.logs);
    throw new AggregateError(result.logs, `Bun build failed (${options.naming})`);
  }

  const output = result.outputs[0];
  const code = await output.text();
  const buffer = Buffer.from(code);

  return {
    rawBytes: buffer.byteLength,
    gzipBytes: Bun.gzipSync(buffer).byteLength,
    code,
  };
}

async function main() {
  console.log('⚡ Running modern parallel Bun build for Aurelia 2 SSR + Polyglot Bridge...');
  const startTime = performance.now();

  // 1. Prepare target directories asynchronously
  await Promise.all([
    mkdir(PUBLIC_DIR, { recursive: true }),
    mkdir(ISLANDS_DIR, { recursive: true }),
    mkdir(BRIDGE_DIR, { recursive: true }),
    mkdir(BRIDGE_CHUNKS_DIR, { recursive: true }),
  ]);

  // 2. Zero-copy kernel copy of Qwikloader runtime for micro-event delegation
  const qwikLoaderSource = resolve(ROOT, 'node_modules/@builder.io/qwik/dist/qwikloader.js');
  const qwikLoaderTarget = resolve(BRIDGE_DIR, 'qwikloader.js');
  await Bun.write(qwikLoaderTarget, Bun.file(qwikLoaderSource));

  // 3. Initialize Qwik optimizer for QRL compilation
  const { createOptimizer } = await import('@builder.io/qwik/optimizer');
  const qwikOptimizer = await createOptimizer();

  // 4. Declare real polyglot framework specifications
  const frameworkSpecs: FrameworkSpec[] = [
    {
      id: 'react',
      name: 'React 19.3',
      trigger: 'load (eager)',
      sourceFile: 'src/bridge/frameworks/ReactWidget.tsx',
      chunkFile: 'react-widget.js',
      compiler: 'Bun TSX Compiler (jsxImportSource: react)',
    },
    {
      id: 'vue',
      name: 'Vue 3.5 SFC',
      trigger: 'load (eager)',
      sourceFile: 'src/bridge/frameworks/VueWidget.vue',
      chunkFile: 'vue-widget.js',
      compiler: '@vue/compiler-sfc@3.5.45 (parse + compileScript inlineTemplate)',
      plugins: [vueSfcBunPlugin()],
    },
    {
      id: 'svelte',
      name: 'Svelte 5.57 Runes',
      trigger: 'island="idle"',
      sourceFile: 'src/bridge/frameworks/SvelteWidget.svelte',
      chunkFile: 'svelte-widget.js',
      compiler: 'svelte/compiler@5.57.3 (generate: client, runes: true)',
      plugins: [svelte5BunPlugin()],
    },
    {
      id: 'preact',
      name: 'Preact 11.2',
      trigger: 'island="interaction"',
      sourceFile: 'src/bridge/frameworks/Widget.preact.tsx',
      chunkFile: 'preact-widget.js',
      compiler: 'Bun TSX Compiler (jsxImportSource: preact)',
    },
    {
      id: 'solid',
      name: 'SolidJS 1.9',
      trigger: 'island="visible"',
      sourceFile: 'src/bridge/frameworks/Widget.solid.tsx',
      chunkFile: 'solid-widget.js',
      compiler: '@babel/core + babel-preset-solid@1.9.19 + @babel/preset-typescript',
      plugins: [solidJsBunPlugin()],
    },
    {
      id: 'qwik',
      name: 'Qwik 1.20',
      trigger: 'island="visible"',
      sourceFile: 'src/bridge/frameworks/Widget.qwik.tsx',
      chunkFile: 'qwik-widget.js',
      compiler: '@builder.io/qwik/optimizer@1.20.4 (transformModulesSync inline QRL)',
      plugins: [qwikBunPlugin(qwikOptimizer)],
    },
    {
      id: 'lit',
      name: 'Lit 3 Web Component',
      trigger: 'island="visible"',
      sourceFile: 'src/bridge/frameworks/Widget.lit.ts',
      chunkFile: 'lit-widget.js',
      compiler: 'Bun TS Compiler + Native W3C CustomElement Shadow DOM (createLitAdapter)',
    },
    {
      id: 'htmx',
      name: 'HTMX 2 Hypermedia',
      trigger: 'au-htmx attribute',
      sourceFile: 'src/bridge/frameworks/htmx.html',
      chunkFile: 'htmx-runtime.js',
      compiler: 'Zero-JS Compiler (Native HTML Hypermedia Engine)',
    },
  ];

  // 5. Build in-memory virtual entries map
  const virtualModules = new Map<string, string>();
  for (const spec of frameworkSpecs) {
    const srcPath = resolve(ROOT, spec.sourceFile);
    virtualModules.set(spec.id, getVirtualEntrySource(spec.id, srcPath));
  }
  const virtualEntryPlugin = createVirtualEntryPlugin(virtualModules);

  // 6. Preload .aux SFC for pricing island
  const pricingAuxPath = resolve(ROOT, 'src/components/pricing-island.aux');
  const pricingAuxSource = await Bun.file(pricingAuxPath).text();
  const pricingAuxCompiled = compileAux(parseAux(pricingAuxSource, pricingAuxPath), {
    isServer: false,
  }).code;

  // 7. Execute ALL builds simultaneously in parallel across CPU cores
  const [
    clientStats,
    loaderStats,
    pricingStats,
    bridgeHostStats,
    ...foreignStats
  ] = await Promise.all([
    // Core fullstack SSR client
    buildChunk({
      entrypoint: resolve(ROOT, 'src/client.ts'),
      outdir: PUBLIC_DIR,
      naming: 'client.js',
      plugins: [auxBunPlugin({ isServer: false })],
      minify: process.env.NODE_ENV === 'production',
    }),
    // Zero-JS selective hydration loader
    buildChunk({
      entrypoint: resolve(ROOT, 'src/island-loader.ts'),
      outdir: PUBLIC_DIR,
      naming: 'island-loader.js',
      minify: true,
    }),
    // Aurelia .aux pricing island chunk
    buildChunk({
      entrypoint: resolve(ROOT, 'src/islands/pricing.ts'),
      outdir: ISLANDS_DIR,
      naming: 'pricing.js',
      plugins: [auxBunPlugin({ isServer: false })],
      minify: true,
    }),
    // Aurelia 2 Bridge Host Shell
    buildChunk({
      entrypoint: resolve(ROOT, 'src/bridge/bridge-app.ts'),
      outdir: BRIDGE_DIR,
      naming: 'app.js',
      plugins: [auxBunPlugin({ isServer: false })],
      external: [
        'react',
        'react-dom/client',
        'vue',
        'svelte',
        'solid-js',
        'solid-js/web',
        'preact',
        '@builder.io/qwik',
        'lit',
        'htmx.org',
      ],
      minify: true,
    }),
    // 8 Foreign Framework Chunks (In-memory virtual entry + native compiler plugins)
    ...frameworkSpecs.map((spec) =>
      buildChunk({
        entrypoint: `virtual:bridge-entry/${spec.id}`,
        outdir: BRIDGE_CHUNKS_DIR,
        naming: spec.chunkFile,
        plugins: [virtualEntryPlugin, ...(spec.plugins ?? [])],
        minify: true,
      })
    ),
  ]);

  // 8. Generate highlighted source and inspection records for manifest in parallel
  const tsTranspiler = new Bun.Transpiler({ loader: 'tsx' });
  const artifacts: FrameworkArtifactRecord[] = await Promise.all(
    frameworkSpecs.map(async (spec, i) => {
      const stats = foreignStats[i];
      const sourceCode = await Bun.file(resolve(ROOT, spec.sourceFile)).text();

      let compiledPreview = compiledSnapshots.get(spec.id) ?? '';
      if (!compiledPreview && spec.id === 'htmx') {
        compiledPreview = [
          `<!-- Zero Compilation Step: Pure HTML Hypermedia Fragment -->`,
          `<!-- Enhanced dynamically at runtime by Aurelia 2 via the \`au-htmx\` custom attribute -->`,
          sourceCode.trim(),
        ].join('\n');
      } else if (!compiledPreview) {
        try {
          compiledPreview = tsTranspiler.transformSync(sourceCode).slice(0, 1500);
        } catch {
          compiledPreview = stats.code.slice(0, 900);
        }
      }

      return {
        id: spec.id,
        name: spec.name,
        trigger: spec.trigger,
        sourceFile: spec.sourceFile,
        compiler: spec.compiler,
        chunkUrl: `/public/bridge/chunks/${spec.chunkFile}`,
        rawBytes: stats.rawBytes,
        gzipBytes: stats.gzipBytes,
        sourceCode,
        compiledPreview,
        sourceHighlighted: highlightCode(sourceCode, spec.sourceFile),
        compiledHighlighted: highlightCode(compiledPreview, spec.id === 'htmx' ? 'markup' : 'javascript'),
      };
    })
  );

  // Add Aurelia 2 .aux SFC artifact record
  artifacts.push({
    id: 'aurelia-aux',
    name: 'Aurelia 2 (.aux SFC)',
    trigger: 'island="visible" (Mode 1 & Mode 2)',
    sourceFile: 'src/components/pricing-island.aux',
    compiler: '@aureliajs/vite-plugin-aux (auxBunPlugin -> CustomElement.define)',
    chunkUrl: '/public/islands/pricing.js',
    rawBytes: pricingStats.rawBytes,
    gzipBytes: pricingStats.gzipBytes,
    sourceCode: pricingAuxSource,
    compiledPreview: pricingAuxCompiled,
    sourceHighlighted: highlightCode(pricingAuxSource, 'pricing-island.aux'),
    compiledHighlighted: highlightCode(pricingAuxCompiled, 'javascript'),
  });

  // 9. Write manifest.json
  const manifest = {
    generatedAt: new Date().toISOString(),
    islandLoader: {
      chunkUrl: '/public/island-loader.js',
      rawBytes: loaderStats.rawBytes,
      gzipBytes: loaderStats.gzipBytes,
    },
    bridgeHost: {
      chunkUrl: '/public/bridge/app.js',
      rawBytes: bridgeHostStats.rawBytes,
      gzipBytes: bridgeHostStats.gzipBytes,
    },
    frameworks: artifacts,
  };

  const manifestPath = resolve(BRIDGE_DIR, 'manifest.json');
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));

  // 10. Purge legacy disk cache directory if it exists
  const legacyCacheDir = resolve(ROOT, 'node_modules/.cache/bridge-build');
  try {
    await rm(legacyCacheDir, { recursive: true, force: true });
  } catch {}

  const durationMs = (performance.now() - startTime).toFixed(1);

  // 11. Clean Telemetry Output
  console.log(`\n🚀 Modern Bun Build Complete in ${durationMs}ms:`);
  console.log(`   • client.js        : ${(clientStats.rawBytes / 1024).toFixed(2)} KB raw (${(clientStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
  console.log(`   • island-loader.js : ${(loaderStats.rawBytes / 1024).toFixed(2)} KB raw (${(loaderStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
  console.log(`   • bridge/app.js    : ${(bridgeHostStats.rawBytes / 1024).toFixed(2)} KB raw (${(bridgeHostStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
  for (const item of artifacts) {
    console.log(
      `   • ${item.id.padEnd(11)} : ${(item.rawBytes / 1024).toFixed(2)} KB raw (${(item.gzipBytes / 1024).toFixed(2)} KB gz) [${item.trigger}]`
    );
  }
}

main().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
