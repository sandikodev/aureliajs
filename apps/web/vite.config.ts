import { fileURLToPath } from 'node:url';
import aurelia from '@aurelia/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // `useDev: false` avoids a broken `/@id/@aurelia/runtime-html/development`
    // resolution under Vite 8. Dev builds of Aurelia add debug assertions, but
    // the regular build is what ships, so this keeps dev == prod module graph.
    aurelia({ useDev: false }),
    tailwindcss(),
  ],
  server: {
    port: 4600,
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
    sourcemap: true,
  },
});
