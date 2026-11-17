import * as esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auxEsbuildPlugin } from '@aureliajs/vite-plugin-aux';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function build() {
  console.log('📦 Bundling client hydration bundle (esbuild)...');
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
  console.log('✅ Client bundle built successfully at public/client.js');

  console.log('📦 Bundling server SSR application (esbuild)...');
  await esbuild.build({
    entryPoints: [resolve(root, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    plugins: [auxEsbuildPlugin({ isServer: true })],
    packages: 'external',
    loader: { '.html': 'text' },
    outfile: resolve(root, 'dist/server.js'),
    sourcemap: true,
    target: ['node22'],
  });
  console.log('✅ Server bundle built successfully at dist/server.js');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
