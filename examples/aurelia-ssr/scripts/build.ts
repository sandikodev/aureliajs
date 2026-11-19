import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');

console.log('⚡ Building client bundle for Pure Aurelia 2 SSR...');

const result = await Bun.build({
  entrypoints: [resolve(ROOT, 'src/client.ts')],
  outdir: resolve(ROOT, 'public'),
  naming: 'client.js',
  target: 'browser',
  format: 'esm',
  loader: { '.html': 'text' },
  minify: true,
});

if (!result.success) {
  console.error('❌ Build failed:', result.logs);
  process.exit(1);
}

const size = result.outputs[0]?.size ?? 0;
console.log(`✅ Client bundle ready at public/client.js (${(size / 1024).toFixed(2)} KB)`);
