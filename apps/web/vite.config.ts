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
    // Vite HMR and the Aurelia dev runtime both use `new Function()` /
    // `eval` internally. Without `unsafe-eval` the browser DevTools will
    // flag a CSP violation on every hot-reload in development.
    // This header is ONLY sent by the Vite dev server — production assets
    // are served by Hono which can set a stricter policy.
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:;",
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
