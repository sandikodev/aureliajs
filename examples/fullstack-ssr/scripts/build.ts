import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { compile as compileSvelte } from 'svelte/compiler';
import { parse as parseVueSfc, compileScript as compileVueScript } from '@vue/compiler-sfc';
import * as babel from '@babel/core';
import {
  auxBunPlugin,
  auxEsbuildPlugin,
  compileAux,
  parseAux,
} from '@aureliajs/vite-plugin-aux';
import { highlightCode } from '../src/bridge/highlighter.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

declare const Bun: {
  build(options: Record<string, unknown>): Promise<{
    success: boolean;
    logs: unknown[];
    outputs: Array<{ path: string; text(): Promise<string> }>;
  }>;
};

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

const compiledSnapshots = new Map<string, string>();

function vueSfcBunPlugin() {
  return {
    name: 'vue-sfc-bun',
    setup(builder: { onLoad(opts: { filter: RegExp }, cb: (args: { path: string }) => unknown): void }) {
      builder.onLoad({ filter: /\.vue$/ }, (args) => {
        const source = readFileSync(args.path, 'utf8');
        const { descriptor } = parseVueSfc(source, { filename: args.path });
        const compiled = compileVueScript(descriptor, {
          id: 'vue-bridge-widget',
          inlineTemplate: true,
        });
        compiledSnapshots.set('vue', compiled.content);
        return {
          contents: compiled.content,
          loader: 'ts',
        };
      });
    },
  };
}

function svelte5BunPlugin() {
  return {
    name: 'svelte5-bun',
    setup(builder: { onLoad(opts: { filter: RegExp }, cb: (args: { path: string }) => unknown): void }) {
      builder.onLoad({ filter: /\.svelte$/ }, (args) => {
        const source = readFileSync(args.path, 'utf8');
        const compiled = compileSvelte(source, {
          filename: args.path,
          generate: 'client',
          runes: true,
        });
        compiledSnapshots.set('svelte', compiled.js.code);
        return {
          contents: compiled.js.code,
          loader: 'js',
        };
      });
    },
  };
}

function solidJsBunPlugin() {
  return {
    name: 'solidjs-babel-bun',
    setup(builder: { onLoad(opts: { filter: RegExp }, cb: (args: { path: string }) => unknown): void }) {
      builder.onLoad({ filter: /\.solid\.tsx$/ }, (args) => {
        const source = readFileSync(args.path, 'utf8');
        const transformed = babel.transformSync(source, {
          filename: args.path,
          presets: ['@babel/preset-typescript', 'babel-preset-solid'],
        });
        const code = transformed?.code ?? '';
        compiledSnapshots.set('solid', code);
        return {
          contents: code,
          loader: 'js',
        };
      });
    },
  };
}

function qwikBunPlugin(opt: {
  transformModulesSync: (opts: unknown) => { modules: Array<{ code: string }> };
}) {
  return {
    name: 'qwik-optimizer-bun',
    setup(builder: { onLoad(opts: { filter: RegExp }, cb: (args: { path: string }) => unknown): void }) {
      builder.onLoad({ filter: /\.qwik\.tsx$/ }, (args) => {
        const source = readFileSync(args.path, 'utf8');
        const res = opt.transformModulesSync({
          srcDir: resolve(root, 'src/bridge/frameworks'),
          rootDir: root,
          mode: 'prod',
          entryStrategy: { type: 'inline' },
          transpileTs: true,
          transpileJsx: true,
          input: [{
            path: args.path,
            code: source,
          }],
        });
        const code = res.modules[0]?.code ?? source;
        compiledSnapshots.set('qwik', code);
        return {
          contents: code,
          loader: 'js',
        };
      });
    },
  };
}

async function buildChunk(options: {
  entrypoint: string;
  outdir: string;
  naming: string;
  plugins?: unknown[];
  external?: string[];
  minify?: boolean;
}): Promise<{ rawBytes: number; gzipBytes: number; code: string }> {
  const result = await Bun.build({
    entrypoints: [options.entrypoint],
    outdir: options.outdir,
    naming: options.naming,
    plugins: options.plugins ?? [],
    loader: {
      '.html': 'text',
    },
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
    console.error(`❌ Bun build failed (${options.naming}):`, result.logs);
    process.exit(1);
  }

  const outFile = resolve(options.outdir, options.naming);
  const code = readFileSync(outFile, 'utf8');
  return {
    rawBytes: Buffer.byteLength(code),
    gzipBytes: gzipSync(code).length,
    code,
  };
}

async function build() {
  console.log('📦 Bundling client, Zero-JS island loader, and polyglot bridge chunks...');

  if (typeof Bun !== 'undefined') {
    const publicDir = resolve(root, 'public');
    const islandsDir = resolve(publicDir, 'islands');
    const bridgeDir = resolve(publicDir, 'bridge');
    const bridgeChunksDir = resolve(bridgeDir, 'chunks');
    mkdirSync(islandsDir, { recursive: true });
    mkdirSync(bridgeChunksDir, { recursive: true });

    // Official Qwikloader runtime for event delegation
    writeFileSync(
      resolve(bridgeDir, 'qwikloader.js'),
      readFileSync(resolve(root, 'node_modules/@builder.io/qwik/dist/qwikloader.js'), 'utf8')
    );

    // 1. Full-app SSR hydration bundle
    const clientResult = await Bun.build({
      entrypoints: [resolve(root, 'src/client.ts')],
      outdir: publicDir,
      naming: 'client.js',
      plugins: [auxBunPlugin({ isServer: false })],
      target: 'browser',
      minify: process.env.NODE_ENV === 'production',
      sourcemap: 'external',
    });
    if (!clientResult.success) {
      console.error('❌ Bun build failed (client):', clientResult.logs);
      process.exit(1);
    }

    // 2. Zero-JS Selective Hydration browser loader (~1.3 KB gzipped, zero Aurelia)
    const loaderStats = await buildChunk({
      entrypoint: resolve(root, 'src/island-loader.ts'),
      outdir: publicDir,
      naming: 'island-loader.js',
      minify: true,
    });

    // 3. Lazy-loaded Aurelia .aux island chunk
    const pricingAuxPath = resolve(root, 'src/components/pricing-island.aux');
    const pricingAuxSource = readFileSync(pricingAuxPath, 'utf8');
    const pricingAuxCompiled = compileAux(parseAux(pricingAuxSource, pricingAuxPath), {
      isServer: false,
    }).code;
    const pricingStats = await buildChunk({
      entrypoint: resolve(root, 'src/islands/pricing.ts'),
      outdir: islandsDir,
      naming: 'pricing.js',
      plugins: [auxBunPlugin({ isServer: false })],
      minify: true,
    });

    // 4. Polyglot Bridge Host App (Aurelia 2 + BridgeConfiguration + IslandsConfiguration, 0 foreign frameworks)
    const bridgeHostStats = await buildChunk({
      entrypoint: resolve(root, 'src/bridge/bridge-app.ts'),
      outdir: bridgeDir,
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
    });

    // 5. Ephemeral Virtual Bridge Entry Generator (Zero-glue DX: eliminates src/bridge/entries entirely)
    const buildCacheDir = resolve(root, 'node_modules/.cache/bridge-build');
    mkdirSync(buildCacheDir, { recursive: true });

    function getSyntheticEntry(spec: { id: string; sourceFile: string }): string {
      const entryPath = resolve(buildCacheDir, `${spec.id}-entry.ts`);
      const src = resolve(root, spec.sourceFile);

      let code = '';
      switch (spec.id) {
        case 'react':
          code = `import * as React from 'react';\nimport * as ReactDOM from 'react-dom/client';\nimport { createReactAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createReactAdapter(React, ReactDOM);\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'vue':
          code = `import * as Vue from 'vue';\nimport { createVueAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createVueAdapter(Vue);\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'svelte':
          code = `import * as Svelte from 'svelte';\nimport { createSvelteAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createSvelteAdapter(Svelte);\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'preact':
          code = `import * as Preact from 'preact';\nimport { createPreactAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createPreactAdapter(Preact);\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'solid':
          code = `import * as SolidWeb from 'solid-js/web';\nimport * as SolidCore from 'solid-js';\nimport { createSolidAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createSolidAdapter(SolidWeb, SolidCore);\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'qwik':
          code = `import * as Qwik from '@builder.io/qwik';\nimport { createQwikAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createQwikAdapter(Qwik);\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'lit':
          code = `import { createLitAdapter } from '@aureliajs/bridge/adapters';\nimport Component from '${src}';\nexport const adapter = createLitAdapter();\nexport const component = Component;\nexport default Component;\n`;
          break;
        case 'htmx':
          code = `import htmx from 'htmx.org';\nhtmx.config.allowEval = false;\nhtmx.config.selfRequestsOnly = true;\nexport default htmx;\n`;
          break;
      }
      writeFileSync(entryPath, code, 'utf8');
      return entryPath;
    }

    // 6. Real Polyglot Framework Chunks (each compiled with its authentic native compiler)
    const { createOptimizer } = await import('@builder.io/qwik/optimizer');
    const qwikOptimizer = await createOptimizer();

    const frameworkSpecs = [
      {
        id: 'react',
        name: 'React 19.3',
        trigger: 'load (eager)',
        sourceFile: 'src/bridge/frameworks/ReactWidget.tsx',
        chunkFile: 'react-widget.js',
        compiler: 'Bun TSX Compiler (jsxImportSource: react)',
        plugins: [],
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
        plugins: [],
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
        plugins: [],
      },
      {
        id: 'htmx',
        name: 'HTMX 2 Hypermedia',
        trigger: 'au-htmx attribute',
        sourceFile: 'src/bridge/frameworks/htmx.html',
        chunkFile: 'htmx-runtime.js',
        compiler: 'Zero-JS Compiler (Native HTML Hypermedia Engine)',
        plugins: [],
      },
    ];

    const artifacts: FrameworkArtifactRecord[] = [];

    for (const spec of frameworkSpecs) {
      const entryFile = getSyntheticEntry(spec);
      const stats = await buildChunk({
        entrypoint: entryFile,
        outdir: bridgeChunksDir,
        naming: spec.chunkFile,
        plugins: spec.plugins,
        minify: true,
      });

      const sourceCode = readFileSync(resolve(root, spec.sourceFile), 'utf8');
      const snapshot = compiledSnapshots.get(spec.id);
      let compiledPreview = snapshot ? snapshot.slice(0, 1500) : '';
      if (!compiledPreview && spec.id === 'htmx') {
        compiledPreview = `<!-- Zero Compilation Step: Pure HTML Hypermedia Fragment -->\n<!-- Enhanced dynamically at runtime by Aurelia 2 via the \`au-htmx\` custom attribute -->\n${sourceCode.trim()}`;
      } else if (!compiledPreview && typeof Bun !== 'undefined') {
        try {
          const transpiler = new (Bun as any).Transpiler({
            loader: spec.sourceFile.endsWith('.ts') ? 'ts' : 'tsx',
          });
          compiledPreview = transpiler.transformSync(sourceCode).slice(0, 1500);
        } catch {
          compiledPreview = stats.code.slice(0, 900);
        }
      }
      if (!compiledPreview) compiledPreview = stats.code.slice(0, 900);

      artifacts.push({
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
        compiledHighlighted: highlightCode(compiledPreview, 'javascript'),
      });
    }

    // Include Aurelia 2 .aux SFC record + Zero-JS loader record
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

    writeFileSync(
      resolve(bridgeDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );

    console.log('✅ Built client, Zero-JS island-loader, bridge host, and 8 real polyglot framework chunks:');
    console.log(
      `   • island-loader.js : ${(loaderStats.rawBytes / 1024).toFixed(2)} KB raw (${(loaderStats.gzipBytes / 1024).toFixed(2)} KB gz)`,
    );
    console.log(
      `   • bridge/app.js    : ${(bridgeHostStats.rawBytes / 1024).toFixed(2)} KB raw (${(bridgeHostStats.gzipBytes / 1024).toFixed(2)} KB gz)`,
    );
    for (const item of artifacts) {
      console.log(
        `   • ${item.id.padEnd(11)} : ${(item.rawBytes / 1024).toFixed(2)} KB raw (${(item.gzipBytes / 1024).toFixed(2)} KB gz) [${item.trigger}]`,
      );
    }
  } else {
    // Fallback to esbuild for Node.js
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: [resolve(root, 'src/client.ts')],
      bundle: true,
      format: 'esm',
      plugins: [auxEsbuildPlugin({ isServer: false })],
      loader: { '.html': 'text' },
      outfile: resolve(root, 'public/client.js'),
      minify: process.env.NODE_ENV === 'production',
      sourcemap: true,
      target: ['es2022'],
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      },
    });
    console.log('✅ Client bundle built successfully with esbuild at public/client.js');
  }
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
