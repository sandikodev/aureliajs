/**
 * Cloudflare Worker Bundle Compiler for Aurelia 2 SSR + Hono
 *
 * Compiles the server application with `@aureliajs/vite-plugin-aux` in server mode,
 * externalizing Cloudflare Workers bindings and Node built-ins while targeting LinkeDOM
 * for edge DOM rendering without Node `vm`.
 */

import type { BunPlugin } from 'bun';
import { auxBunPlugin } from '@aureliajs/vite-plugin-aux';

const ROOT = new URL('..', import.meta.url).pathname;

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
