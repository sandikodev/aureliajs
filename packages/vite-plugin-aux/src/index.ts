import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFilter } from '@rollup/pluginutils';
import type { Options as SwcOptions, ParserConfig } from '@swc/wasm';
import type { Plugin, Rollup } from 'vite';
import { transformWithOxc } from 'vite';
import { compileAux } from './compiler.js';
import { parseAux } from './parser.js';
import type { AuxDescriptor, AuxPluginOptions } from './types.js';

export * from './types.js';
export * from './parser.js';
export * from './compiler.js';
export * from './scope.js';
export * from './esbuild.js';

const AUX_QUERY_REGEX = /[?&]aux(&|$)/;
const STYLE_QUERY_REGEX = /[?&]type=style(&|$)/;
const STYLE_INDEX_REGEX = /[?&]index=(\d+)(&|$)/;
const SWC_HELPER_PREFIX = '@swc/helpers/_/';

const baseRequire = createRequire(import.meta.url);
function getPluginRequire(): NodeRequire {
  try {
    return createRequire(baseRequire.resolve('@aureliajs/vite-plugin-aux/package.json'));
  } catch {
    return baseRequire;
  }
}

const pluginRequire = getPluginRequire();
let swcModulePromise: Promise<typeof import('@swc/wasm')> | undefined;
let swcHelpersPath: string | undefined;

type SwcTarget = NonNullable<NonNullable<SwcOptions['jsc']>['target']>;
type StandardDecoratorTransformConfig = NonNullable<
  NonNullable<SwcOptions['jsc']>['transform']
> & {
  decoratorVersion: '2023-11';
  tsEnumIsMutable: boolean;
  useDefineForClassFields: boolean;
};

async function loadSwc(): Promise<typeof import('@swc/wasm')> {
  if (!swcModulePromise) {
    const swcEntry = pluginRequire.resolve('@swc/wasm');
    swcModulePromise = import(pathToFileURL(swcEntry).href) as Promise<typeof import('@swc/wasm')>;
  }
  return await swcModulePromise;
}

/**
 * First-party Vite plugin for Aurelia 2 .aux Single-File Components.
 * Uses TC39 Stage 3 standard decorators (2023-11) via @swc/wasm + Vite 8 native Oxc.
 */
export function auxPlugin(options: AuxPluginOptions = {}): Plugin {
  const filter = createFilter(options.include ?? /\.aux$/, options.exclude);
  const descriptorCache = new Map<string, AuxDescriptor>();

  return {
    name: 'vite-plugin-aux',
    enforce: 'pre',

    resolveId(id) {
      if (AUX_QUERY_REGEX.test(id)) {
        return id;
      }

      if (id.startsWith(SWC_HELPER_PREFIX)) {
        const helperName = id.slice(SWC_HELPER_PREFIX.length);
        if (/^_[A-Za-z0-9_]+$/.test(helperName)) {
          swcHelpersPath ??= dirname(pluginRequire.resolve('@swc/helpers/package.json'));
          return resolve(swcHelpersPath, 'esm', `${helperName}.js`);
        }
      }

      return null;
    },

    load(id) {
      if (!AUX_QUERY_REGEX.test(id)) {
        return null;
      }

      // Handle virtual style blocks: foo.aux?aux&type=style&index=0.css
      if (STYLE_QUERY_REGEX.test(id)) {
        const cleanId = id.split('?')[0] ?? id;
        let descriptor = descriptorCache.get(cleanId);
        if (!descriptor && fs.existsSync(cleanId)) {
          const raw = fs.readFileSync(cleanId, 'utf-8');
          descriptor = parseAux(raw, cleanId);
          descriptorCache.set(cleanId, descriptor);
        }
        if (!descriptor) {
          return '';
        }

        const match = STYLE_INDEX_REGEX.exec(id);
        const index = match && match[1] ? parseInt(match[1], 10) : 0;
        const compiled = compileAux(descriptor, options);
        const style = compiled.styles.find((s) => s.index === index);

        return style ? style.css : '';
      }

      return null;
    },

    async transform(rawCode, id) {
      // Don't process queries here (e.g. style sub-requests)
      if (id.includes('?')) {
        return null;
      }

      if (!filter(id)) {
        return null;
      }

      // Parse the .aux component
      const descriptor = parseAux(rawCode, id);
      descriptorCache.set(id, descriptor);

      // Generate Aurelia 2 module code
      const compiled = compileAux(descriptor, options);
      const isTs = descriptor.script?.lang !== 'js';
      const virtualFilename = `${id}.${isTs ? 'ts' : 'js'}`;

      let codeToTransform = compiled.code;

      // Transform TC39 Stage 3 standard decorators (2023-11) required by Aurelia 2 RC.2
      if (codeToTransform.includes('@')) {
        const swc = await loadSwc();
        const parser: ParserConfig = isTs
          ? { syntax: 'typescript', decorators: true }
          : { syntax: 'ecmascript', decorators: true, decoratorsBeforeExport: true };

        const transformConfig: StandardDecoratorTransformConfig = {
          decoratorVersion: '2023-11',
          tsEnumIsMutable: true,
          useDefineForClassFields: true,
        };

        const swcResult = await swc.transform(codeToTransform, {
          filename: virtualFilename,
          sourceFileName: id,
          sourceMaps: true,
          inlineSourcesContent: true,
          swcrc: false,
          configFile: false,
          jsc: {
            parser,
            target: 'esnext' as SwcTarget,
            externalHelpers: true,
            transform: transformConfig,
          },
        });

        codeToTransform = swcResult.code;
      }

      // Strip TypeScript types and emit ES2022 via Vite 8's native Oxc compiler
      const transformed = await transformWithOxc(codeToTransform, virtualFilename, {
        lang: isTs ? 'ts' : 'js',
        target: 'es2022',
        sourcemap: true,
      });

      return {
        code: transformed.code,
        map: (transformed.map as Rollup.SourceMapInput) ?? null,
      };
    },

    async handleHotUpdate({ file, server, read }) {
      if (!file.endsWith('.aux')) {
        return;
      }

      const prevDescriptor = descriptorCache.get(file);
      const newContent = await read();
      const newDescriptor = parseAux(newContent, file);
      descriptorCache.set(file, newDescriptor);

      if (!prevDescriptor) {
        return;
      }

      // Check if only styles changed
      const scriptChanged = prevDescriptor.script?.content !== newDescriptor.script?.content;
      const templateChanged = prevDescriptor.template?.content !== newDescriptor.template?.content;

      if (!scriptChanged && !templateChanged) {
        // Style-only update: find affected virtual style modules
        const styleModules = Array.from(server.moduleGraph.idToModuleMap.values()).filter(
          (mod) => mod.id && mod.id.startsWith(file) && STYLE_QUERY_REGEX.test(mod.id),
        );

        if (styleModules.length > 0) {
          styleModules.forEach((mod) => server.moduleGraph.invalidateModule(mod));
          return styleModules;
        }
      }

      // Reload the component module
      const mainModule = server.moduleGraph.getModuleById(file);
      if (mainModule) {
        server.moduleGraph.invalidateModule(mainModule);
        return [mainModule];
      }
    },
  };
}

export default auxPlugin;
