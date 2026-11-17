import { describe, it, expect } from 'vitest';
import { auxEsbuildPlugin } from '../src/esbuild.js';

describe('auxEsbuildPlugin esbuild plugin', () => {
  it('instantiates plugin with options', () => {
    const pluginClient = auxEsbuildPlugin({ isServer: false });
    expect(pluginClient.name).toBe('esbuild-aux-plugin');
    expect(typeof pluginClient.setup).toBe('function');

    const pluginServer = auxEsbuildPlugin({ isServer: true });
    expect(pluginServer.name).toBe('esbuild-aux-plugin');
    expect(typeof pluginServer.setup).toBe('function');
  });

  it('registers onResolve and onLoad handlers', () => {
    const plugin = auxEsbuildPlugin();
    const resolveFilters: RegExp[] = [];
    const loadFilters: RegExp[] = [];

    const mockBuild = {
      onResolve: (opts: { filter: RegExp }, _cb: any) => {
        resolveFilters.push(opts.filter);
      },
      onLoad: (opts: { filter: RegExp }, _cb: any) => {
        loadFilters.push(opts.filter);
      },
    };

    plugin.setup(mockBuild as any);
    expect(resolveFilters.length).toBeGreaterThan(0);
    expect(loadFilters.length).toBeGreaterThanOrEqual(2);
  });
});
