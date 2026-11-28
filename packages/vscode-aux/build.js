import * as esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  await esbuild.build({
    entryPoints: [resolve(__dirname, 'src/extension.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['vscode'],
    outfile: resolve(__dirname, 'dist/extension.js'),
    sourcemap: true,
    minify: false,
  });
  await esbuild.build({
    entryPoints: [resolve(__dirname, 'src/check.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    external: ['typescript'],
    banner: { js: '#!/usr/bin/env node' },
    outfile: resolve(__dirname, 'dist/check.js'),
    sourcemap: true,
    minify: false,
  });
  console.log('✓ Successfully built packages/vscode-aux/dist/extension.js and dist/check.js');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
