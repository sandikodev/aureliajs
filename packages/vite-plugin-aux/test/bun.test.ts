import { describe, it, expect } from 'vitest';
import { auxBunPlugin } from '../src/bun.js';

describe('auxBunPlugin Bun plugin', () => {
  it('instantiates plugin with options', () => {
    const pluginClient = auxBunPlugin({ isServer: false });
    expect(pluginClient.name).toBe('bun-aux-plugin');
    expect(typeof pluginClient.setup).toBe('function');

    const pluginServer = auxBunPlugin({ isServer: true });
    expect(pluginServer.name).toBe('bun-aux-plugin');
    expect(typeof pluginServer.setup).toBe('function');
  });

  it('registers onLoad handler on builder', () => {
    const plugin = auxBunPlugin();
    const loadFilters: RegExp[] = [];

    const mockBuilder = {
      onLoad: (opts: { filter: RegExp }, _cb: any) => {
        loadFilters.push(opts.filter);
      },
    };

    plugin.setup(mockBuilder as any);
    expect(loadFilters.length).toBe(1);
    expect(loadFilters[0]?.test('test.aux')).toBe(true);
    expect(loadFilters[0]?.test('test.ts')).toBe(false);
  });
});
