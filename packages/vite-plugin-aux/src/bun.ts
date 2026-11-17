import * as fs from 'node:fs';
import { parseAux } from './parser.js';
import { compileAux } from './compiler.js';

export interface AuxBunPluginOptions {
  /**
   * Whether to compile for server SSR environment (preserves <script server>)
   * or client browser environment (strips <script server>). Defaults to true.
   */
  isServer?: boolean;
}

/**
 * Official Bun plugin for Aurelia 2 Single-File Components (.aux)
 * 
 * Supports on-the-fly SSR compilation, <script setup>, <script server>,
 * and native Bun.build client bundling.
 * 
 * @example
 * ```typescript
 * import { auxBunPlugin } from '@aureliajs/vite-plugin-aux/bun';
 * 
 * // Client bundle with Bun.build
 * await Bun.build({
 *   entrypoints: ['./src/client.ts'],
 *   outdir: './public',
 *   plugins: [auxBunPlugin({ isServer: false })],
 * });
 * ```
 */
export function auxBunPlugin(options: AuxBunPluginOptions = {}) {
  return {
    name: 'bun-aux-plugin',
    setup(builder: {
      onLoad: (opts: { filter: RegExp }, callback: (args: { path: string }) => Promise<{ contents: string; loader: string }>) => void;
    }) {
      builder.onLoad({ filter: /\.aux$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');
        const descriptor = parseAux(source, args.path);
        const compiled = compileAux(descriptor, { isServer: options.isServer ?? true });
        return {
          contents: compiled.code,
          loader: 'ts',
        };
      });
    },
  };
}

// Auto-register when imported or preloaded in Bun (e.g. bunfig.toml `preload = ["..."]`)
declare const Bun: any;
if (typeof Bun !== 'undefined' && typeof Bun.plugin === 'function') {
  try {
    Bun.plugin(auxBunPlugin({ isServer: true }));
  } catch {
    // Ignore if plugin is already registered
  }
}
