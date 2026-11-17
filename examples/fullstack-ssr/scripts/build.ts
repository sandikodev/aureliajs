import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auxBunPlugin, auxEsbuildPlugin } from '@aureliajs/vite-plugin-aux';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

declare const Bun: any;

async function build() {
  console.log('📦 Bundling client hydration bundle...');

  if (typeof Bun !== 'undefined') {
    // Native Bun.build (Instant sub-millisecond bundling)
    const result = await Bun.build({
      entrypoints: [resolve(root, 'src/client.ts')],
      outdir: resolve(root, 'public'),
      naming: 'client.js',
      plugins: [auxBunPlugin({ isServer: false })],
      target: 'browser',
      minify: process.env.NODE_ENV === 'production',
      sourcemap: 'external',
    });

    if (!result.success) {
      console.error('❌ Bun build failed:', result.logs);
      process.exit(1);
    }
    console.log('✅ Client bundle built successfully with Bun at public/client.js');
  } else {
    // Fallback to esbuild for Node.js
    const esbuild = await import('esbuild');
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
    console.log('✅ Client bundle built successfully with esbuild at public/client.js');
  }
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
