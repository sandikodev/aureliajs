/**
 * Build Script for Aurelia 2 Zero-JS Islands
 *
 * Compiles:
 * 1. `island-loader.js`: Tiny client runtime (~1.28 KB gzipped) that watches `[data-au-island]`
 * 2. `islands/pricing.js`: Isolated Aurelia island component chunk hydrated on trigger
 */

import { $ } from 'bun';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PUBLIC_DIR = `${ROOT}/public`;
const ISLANDS_DIR = `${PUBLIC_DIR}/islands`;

async function buildChunk(options: {
  entrypoint: string;
  outdir: string;
  naming: string;
  minify?: boolean;
}) {
  const result = await Bun.build({
    entrypoints: [options.entrypoint],
    root: ROOT,
    outdir: options.outdir,
    naming: options.naming,
    loader: { '.html': 'text' },
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
  };
}

async function main() {
  console.log('⚡ Compiling Aurelia 2 Zero-JS Island bundles...');
  const startTime = performance.now();

  await $`mkdir -p ${PUBLIC_DIR} ${ISLANDS_DIR}`.quiet();

  const [loaderStats, pricingStats] = await Promise.all([
    buildChunk({
      entrypoint: `${ROOT}/src/island-loader.ts`,
      outdir: PUBLIC_DIR,
      naming: 'island-loader.js',
      minify: true,
    }),
    buildChunk({
      entrypoint: `${ROOT}/src/islands/pricing.ts`,
      outdir: ISLANDS_DIR,
      naming: 'pricing.js',
      minify: true,
    }),
  ]);

  const durationMs = (performance.now() - startTime).toFixed(1);
  console.log(`\n🚀 Aurelia Islands Build Complete in ${durationMs}ms:`);
  console.log(`   • island-loader.js : ${(loaderStats.rawBytes / 1024).toFixed(2)} KB raw (${(loaderStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
  console.log(`   • pricing island   : ${(pricingStats.rawBytes / 1024).toFixed(2)} KB raw (${(pricingStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
}

main().catch((err) => {
  console.error('Fatal build error:', err);
  process.exit(1);
});
