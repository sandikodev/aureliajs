/**
 * Cloudflare Worker Bundle Compiler for Aurelia 2 SSR + Hono
 *
 * Compiles the server application with `@aureliajs/vite-plugin-aux` in server mode,
 * externalizing Cloudflare Workers bindings and Node built-ins while targeting LinkeDOM
 * for edge DOM rendering without Node `vm`.
 */

import { resolve } from 'node:path';
import { auxBunPlugin } from '@aureliajs/vite-plugin-aux';

const ROOT = resolve(import.meta.dir, '..');

console.log('⚡ Compiling Aurelia 2 SSR Cloudflare Worker isolate...');

const result = await Bun.build({
  entrypoints: [resolve(ROOT, 'src/index.ts')],
  outdir: resolve(ROOT, 'dist'),
  naming: 'worker.js',
  target: 'browser',
  format: 'esm',
  plugins: [auxBunPlugin({ isServer: true })],
  external: ['cloudflare:*', 'node:*', 'jsdom'],
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
