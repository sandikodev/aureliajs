import { defineConfig } from 'vite';
import { auxPlugin } from '@aureliajs/vite-plugin-aux';
import aurelia from '@aurelia/vite-plugin';

export default defineConfig({
  plugins: [
    auxPlugin(),
    aurelia({ useDev: false }),
  ],
});
