/**
 * Build Script for Canonical Aurelia 2 Fullstack SSR
 *
 * Compiles canonical client bundle with Bun.build:
 * - `client.js`: Aurelia 2 full hydration runtime
 */

import { $ } from 'bun';
import type { BunPlugin } from 'bun';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PUBLIC_DIR = `${ROOT}/public`;

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
  console.log('⚡ Running modern parallel Bun build for Aurelia 2 Fullstack SSR...');
  const startTime = performance.now();

  // 1. Prepare target directory
  await $`mkdir -p ${PUBLIC_DIR}`.quiet();

  // 2. Build core canonical client bundle
  const clientStats = await buildChunk({
    entrypoint: `${ROOT}/src/client.ts`,
    outdir: PUBLIC_DIR,
    naming: 'client.js',
    minify: process.env.NODE_ENV === 'production',
  });

  const durationMs = (performance.now() - startTime).toFixed(1);
  console.log(`\n🚀 Modern Bun Build Complete in ${durationMs}ms:`);
  console.log(`   • client.js : ${(clientStats.rawBytes / 1024).toFixed(2)} KB raw (${(clientStats.gzipBytes / 1024).toFixed(2)} KB gz)`);
}

main().catch((err) => {
  console.error('Fatal build error:', err);
  process.exit(1);
});
