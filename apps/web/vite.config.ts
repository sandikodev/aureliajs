import { fileURLToPath } from 'node:url';
import { auxPlugin } from '@aureliajs/vite-plugin-aux';
import aurelia from '@aurelia/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    auxPlugin(),
    // `useDev: false` avoids a broken `/@id/@aurelia/runtime-html/development`
    // resolution under Vite 8. Dev builds of Aurelia add debug assertions, but
    // the regular build is what ships, so this keeps dev == prod module graph.
    aurelia({ useDev: false }),
    tailwindcss(),
  ],
  server: {
    port: 4600,
    headers: {
      'Cache-Control': 'no-store',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4601',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4601',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    // Production source maps are not uploaded anywhere: they only add ~2 MB of
    // deploy output (Vercel already blocks /assets/*.map with a 403). Enable
    // with SOURCEMAPS=1 for a debugging build.
    sourcemap: process.env.SOURCEMAPS === '1',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/zod') || id.includes('zod@')) {
            return 'vendor-zod';
          }
          if (id.includes('node_modules/@aurelia') || id.includes('node_modules/aurelia')) {
            return 'vendor-aurelia';
          }
          if (id.includes('/src/ui/')) {
            return 'ui-primitives';
          }
          return undefined;
        },
      },
    },
  },
});
