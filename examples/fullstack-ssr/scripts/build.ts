import * as fs from 'node:fs';
import * as esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAux, compileAux } from '../../../packages/vite-plugin-aux/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function createEsbuildAuxPlugin(): esbuild.Plugin {
  const styleCache = new Map<string, string>();

  return {
    name: 'esbuild-aux-plugin',
    setup(build) {
      build.onResolve({ filter: /[?&]aux/ }, (args) => {
        return { path: args.path, namespace: 'aux-style' };
      });

      build.onLoad({ filter: /.*/, namespace: 'aux-style' }, (args) => {
        const css = styleCache.get(args.path) ?? '';
        return { contents: css, loader: 'css' };
      });

      build.onLoad({ filter: /\.aux$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');
        const descriptor = parseAux(source, args.path);
        const compiled = compileAux(descriptor);

        for (const styleObj of compiled.styles) {
          const styleKey = `${args.path}?aux&type=style&index=${styleObj.index}.css`;
          styleCache.set(styleKey, styleObj.css);
        }

        return {
          contents: compiled.code,
          loader: 'ts',
          resolveDir: dirname(args.path),
        };
      });
    },
  };
}

async function build() {
  const auxPlugin = createEsbuildAuxPlugin();

  console.log('📦 Bundling client hydration bundle (esbuild)...');
  await esbuild.build({
    entryPoints: [resolve(root, 'src/client.ts')],
    bundle: true,
    format: 'esm',
    plugins: [auxPlugin],
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
    plugins: [auxPlugin],
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
