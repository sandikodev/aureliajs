import * as fs from 'node:fs';
import { dirname } from 'node:path';
import { parseAux } from './parser.js';
import { compileAux } from './compiler.js';

export interface AuxEsbuildPluginOptions {
  /**
   * Whether to compile for server SSR environment (preserves <script server>)
   * or client browser environment (strips <script server>).
   */
  isServer?: boolean;
}

/**
 * Official esbuild plugin for Aurelia 2 Single-File Components (.aux)
 * 
 * Supports <script setup>, <script server>, scoped styles, and execution boundaries.
 * 
 * @example
 * ```typescript
 * import { auxEsbuildPlugin } from '@aureliajs/vite-plugin-aux';
 * 
 * // Client bundle
 * await esbuild.build({
 *   plugins: [auxEsbuildPlugin({ isServer: false })],
 *   ...
 * });
 * 
 * // Server SSR bundle
 * await esbuild.build({
 *   plugins: [auxEsbuildPlugin({ isServer: true })],
 *   ...
 * });
 * ```
 */
export function auxEsbuildPlugin(options: AuxEsbuildPluginOptions = {}) {
  const styleCache = new Map<string, string>();

  return {
    name: 'esbuild-aux-plugin',
    setup(build: {
      onResolve: (opts: { filter: RegExp }, callback: (args: { path: string }) => { path: string; namespace: string }) => void;
      onLoad: (opts: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => Promise<{ contents: string; loader: string; resolveDir?: string } | { contents: string; loader: string }>) => void;
    }) {
      build.onResolve({ filter: /[?&]aux/ }, (args) => {
        return { path: args.path, namespace: 'aux-style' };
      });

      build.onLoad({ filter: /.*/, namespace: 'aux-style' }, async (args) => {
        const css = styleCache.get(args.path) ?? '';
        return { contents: css, loader: 'css' };
      });

      build.onLoad({ filter: /\.aux$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');
        const descriptor = parseAux(source, args.path);
        const compiled = compileAux(descriptor, { isServer: Boolean(options.isServer) });

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
