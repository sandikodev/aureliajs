/**
 * Build Script for Canonical Aurelia 2 Fullstack SSR
 *
 * Compiles canonical client bundle with Bun.build:
 * - Supports zero-config auto-discovery of all pages in `src/pages/`
 * - Supports opt-in explicit customization via `src/client.ts`
 */

import { existsSync } from 'node:fs';
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
 * Auto-discovery Virtual Client Hydration Plugin
 * Automatically discovers all Aurelia 2 page components under src/pages,
 * synthesizing the client hydration bootstrap in memory with zero manual glue code.
 */
function createVirtualClientPlugin(root: string): BunPlugin {
  return {
    name: 'aurelia-virtual-client',
    setup(b) {
      b.onResolve({ filter: /^virtual:aurelia-client$/ }, () => ({
        path: `${root}/.virtual-client-entry.ts`,
      }));
      b.onLoad({ filter: /\.virtual-client-entry\.ts$/ }, async () => {
        const glob = new Bun.Glob('src/pages/**/*.{ts,aux}');
        const files = (await Array.fromAsync(glob.scan({ cwd: root })))
          .filter((f) => !f.endsWith('.d.ts'))
          .sort();
        const imports = files
          .map((f, i) => `import * as _P${i} from '${root}/${f}';`)
          .join('\n');
        const arrays = files.map((_, i) => `...Object.values(_P${i})`).join(', ');

        const contents = `/**
 * Auto-generated Aurelia 2 Client Hydration Virtual Entrypoint
 */
import { createClientHydrator } from '@aureliajs/ssr/client';
${imports}

const components = [${arrays}].filter((c) => typeof c === 'function');

createClientHydrator({ components });
`;
        return { contents, loader: 'ts' };
      });
    },
  };
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

  // 2. Resolve client hydration entrypoint (Explicit custom client.ts vs Auto-discovered Virtual entry)
  const hasCustomClient = existsSync(`${ROOT}/src/client.ts`);
  const entrypoint = hasCustomClient ? `${ROOT}/src/client.ts` : 'virtual:aurelia-client';
  const plugins = hasCustomClient ? [] : [createVirtualClientPlugin(ROOT)];

  if (hasCustomClient) {
    console.log('📦 Using explicit custom client hydration entrypoint (src/client.ts)');
  } else {
    console.log('✨ Auto-discovering pages convention for zero-config client hydration');
  }

  const clientStats = await buildChunk({
    entrypoint,
    outdir: PUBLIC_DIR,
    naming: 'client.js',
    plugins,
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
