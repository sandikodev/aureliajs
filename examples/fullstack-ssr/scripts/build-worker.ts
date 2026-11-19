/**
 * Cloudflare Worker Bundle Compiler for Aurelia 2 SSR + Hono
 *
 * Compiles the server application with `@aureliajs/vite-plugin-aux` in server mode,
 * externalizing Cloudflare Workers bindings and Node built-ins while targeting LinkeDOM
 * for edge DOM rendering without Node `vm`.
 */

import type { BunPlugin } from 'bun';
import { auxBunPlugin } from '@aureliajs/vite-plugin-aux';
import * as babel from '@babel/core';
import { parse as parseVueSfc, compileScript as compileVueScript } from '@vue/compiler-sfc';
import { compile as compileSvelte } from 'svelte/compiler';

const ROOT = new URL('..', import.meta.url).pathname;

function vueWorkerBunPlugin(): BunPlugin {
  return {
    name: 'vue-worker-bun',
    setup(builder) {
      builder.onLoad({ filter: /\.vue$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const { descriptor } = parseVueSfc(source, { filename: args.path });
        const compiled = compileVueScript(descriptor, {
          id: 'vue-worker-widget',
          inlineTemplate: true,
        });
        return { contents: compiled.content, loader: 'ts' };
      });
    },
  };
}

function svelteWorkerBunPlugin(): BunPlugin {
  return {
    name: 'svelte-worker-bun',
    setup(builder) {
      builder.onLoad({ filter: /\.svelte$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const compiled = compileSvelte(source, {
          filename: args.path,
          generate: 'client',
          runes: true,
        });
        return { contents: compiled.js.code, loader: 'js' };
      });
    },
  };
}

function solidWorkerBunPlugin(): BunPlugin {
  return {
    name: 'solid-worker-bun',
    setup(builder) {
      builder.onLoad({ filter: /(solid-.*|\.solid)\.tsx$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const transformed = babel.transformSync(source, {
          filename: args.path,
          presets: [
            '@babel/preset-typescript',
            ['babel-preset-solid', { generate: 'ssr', hydratable: true }],
          ],
        });
        return { contents: transformed?.code ?? '', loader: 'js' };
      });
    },
  };
}

/**
 * Stub JSDOM in Cloudflare Worker isolate.
 * Cloudflare Workers runtime (workerd) uses LinkeDOM and lacks Node's `vm` module.
 * Stubbing JSDOM at the bundler layer eliminates transitive dependencies like `whatwg-url`
 * and prevents unenv shim warnings during Wrangler deployment.
 */
function stubJsdomPlugin(): BunPlugin {
  return {
    name: 'stub-jsdom-worker',
    setup(builder) {
      builder.onResolve({ filter: /^jsdom$/ }, () => ({
        path: 'jsdom-stub',
        namespace: 'jsdom-stub',
      }));
      builder.onLoad({ filter: /.*/, namespace: 'jsdom-stub' }, () => ({
        contents:
          'export class JSDOM { constructor() { throw new Error("JSDOM is not supported in Cloudflare Workers — LinkeDOM is active."); } }',
        loader: 'js',
      }));
    },
  };
}

console.log('⚡ Compiling Aurelia 2 SSR Cloudflare Worker isolate...');

const result = await Bun.build({
  entrypoints: [`${ROOT}/src/index.ts`],
  outdir: `${ROOT}/dist`,
  naming: 'worker.js',
  target: 'browser',
  format: 'esm',
  loader: { '.html': 'text' },
  plugins: [
    stubJsdomPlugin(),
    auxBunPlugin({ isServer: true }),
    vueWorkerBunPlugin(),
    svelteWorkerBunPlugin(),
    solidWorkerBunPlugin(),
  ],
  external: ['cloudflare:*', 'node:*', 'hono/bun'],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.WORKER': JSON.stringify('true'),
  },
  minify: true,
});

if (!result.success) {
  console.error('❌ Cloudflare Worker build failed:', result.logs);
  process.exit(1);
}

const size = result.outputs[0]?.size ?? 0;
console.log(`✅ Cloudflare Worker ready at dist/worker.js (${(size / 1024).toFixed(2)} KB)`);
