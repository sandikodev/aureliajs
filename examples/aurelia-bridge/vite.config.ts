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
      // 1. Vue 3 SFCs
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
    configureServer(server) {
      server.middlewares.use('/api/htmx-demo', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`
          <div class="htmx-live-banner">
            <span class="htmx-badge">⚡ HTMX 2.0 Live Hypermedia</span>
            <p>Delivered dynamically from the server via <strong>hx-get="/api/htmx-demo"</strong> and swapped into the Aurelia 2 DOM by the <strong>au-htmx</strong> Custom Attribute without any wrapper boilerplate.</p>
            <div class="htmx-meta">Server Time: <code>${new Date().toLocaleTimeString()}</code> • Status: <strong>200 OK</strong></div>
          </div>
        `);
      });
    },
  };
}

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
  },
  plugins: [polyglotBridgePlugin(), aurelia({ useDev: false })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
