import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';
import { bridge } from '@aureliajs/bridge/vite';

export default defineConfig({
  plugins: [
    bridge(),
    aurelia({ useDev: false }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
