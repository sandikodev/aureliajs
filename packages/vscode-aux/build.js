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
  console.log('✓ Successfully built packages/vscode-aux/dist/extension.js');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
