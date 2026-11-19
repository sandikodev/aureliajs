/**
 * Build Script for Aurelia 2 Fullstack SSR + Zero-JS Islands
 *
 * Compiles client bundles and island hydration chunks with Bun.build:
 * - `client.js`       : Aurelia 2 full hydration runtime
 * - `island-loader.js`: Zero-JS selective hydration loader (3 KB)
 * - `islands/pricing.js`: Aurelia .aux pricing island chunk
 */

import { $ } from 'bun';
import type { BunPlugin } from 'bun';
import { auxBunPlugin } from '@aureliajs/vite-plugin-aux';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PUBLIC_DIR = `${ROOT}/public`;
const ISLANDS_DIR = `${PUBLIC_DIR}/islands`;

interface ChunkResult {
  rawBytes: number;
  gzipBytes: number;
  code: string;
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
  console.log('⚡ Running modern parallel Bun build for Aurelia 2 SSR + Islands...');
  const startTime = performance.now();

  // 1. Prepare target directories asynchronously via Bun shell
  await $`mkdir -p ${PUBLIC_DIR} ${ISLANDS_DIR}`.quiet();

  // 2. Remove legacy bridge directory if present
  await $`rm -rf ${PUBLIC_DIR}/bridge`.quiet();

  // 3. Build core bundles simultaneously in parallel across CPU cores
  const [clientStats, loaderStats, pricingStats] = await Promise.all([
    // Core fullstack SSR client
    buildChunk({
      entrypoint: `${ROOT}/src/client.ts`,
      outdir: PUBLIC_DIR,
      naming: 'client.js',
      plugins: [auxBunPlugin({ isServer: false })],
      minify: process.env.NODE_ENV === 'production',
    }),
    // Zero-JS selective hydration loader
    buildChunk({
      entrypoint: `${ROOT}/src/island-loader.ts`,
      outdir: PUBLIC_DIR,
      naming: 'island-loader.js',
      minify: true,
    }),
    // Aurelia .aux pricing island chunk
    buildChunk({
      entrypoint: `${ROOT}/src/islands/pricing.ts`,
      outdir: ISLANDS_DIR,
      naming: 'pricing.js',
      plugins: [auxBunPlugin({ isServer: false })],
      minify: true,
    }),
  ]);

  const durationMs = (performance.now() - startTime).toFixed(1);
  console.log(`\n🚀 Modern Bun Build Complete in ${durationMs}ms:`);
  console.log(`   • client.js        : ${(clientStats.rawBytes / 1024).toFixed(2)} KB raw (${(clientStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
  console.log(`   • island-loader.js : ${(loaderStats.rawBytes / 1024).toFixed(2)} KB raw (${(loaderStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
  console.log(`   • pricing island   : ${(pricingStats.rawBytes / 1024).toFixed(2)} KB raw (${(pricingStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
}

main().catch((err) => {
  console.error('Fatal build error:', err);
  process.exit(1);
});
