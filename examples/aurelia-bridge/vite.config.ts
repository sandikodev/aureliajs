import { defineConfig, type Plugin } from 'vite';
import aurelia from '@aurelia/vite-plugin';
import { parse, compileScript } from '@vue/compiler-sfc';
import { compile as compileSvelte } from 'svelte/compiler';

/**
 * Lightweight polyglot compiler plugin for Vite.
 * Transforms Vue SFC, Svelte 5 runes, Solid JSX, and Aurelia HTML templates on-the-fly.
 */
function polyglotBridgePlugin(): Plugin {
  return {
    name: 'vite-plugin-polyglot-bridge',
    enforce: 'pre',
    async transform(code, id) {
      // 1. Aurelia HTML Templates
      if (id.endsWith('.html') && !id.endsWith('index.html')) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      }

      // 2. Vue 3 SFCs
      if (id.endsWith('.vue')) {
        const { descriptor } = parse(code, { filename: id });
        const compiled = compileScript(descriptor, { id: 'vue-sfc', inlineTemplate: true });
        const { transformWithOxc } = await import('vite');
        const stripped = await transformWithOxc(compiled.content, `${id}.ts`, {
          lang: 'ts',
          target: 'es2022',
        });
        return {
          code: stripped.code,
          map: stripped.map,
        };
      }

      // 3. Svelte 5 Runes
      if (id.endsWith('.svelte')) {
        const compiled = compileSvelte(code, { filename: id, generate: 'client', runes: true });
        return {
          code: compiled.js.code,
          map: compiled.js.map,
        };
      }

      // 4. SolidJS JSX Components
      if (id.includes('solid') && (id.endsWith('.tsx') || id.endsWith('.jsx'))) {
        const babel = await import('@babel/core');
        const transformed = babel.transformSync(code, {
          filename: id,
          presets: [
            '@babel/preset-typescript',
            ['babel-preset-solid', { generate: 'dom', hydratable: false }],
          ],
        });
        return {
          code: transformed?.code ?? '',
          map: transformed?.map,
        };
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [polyglotBridgePlugin(), aurelia({ useDev: false })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
