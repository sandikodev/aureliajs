import { Buffer } from 'node:buffer';
import { describe, it, expect } from 'bun:test';
import { CustomElement } from 'aurelia';
import { auxPlugin } from '../src/index';

describe('auxPlugin Vite Plugin', () => {
  it('instantiates with default configuration', () => {
    const plugin = auxPlugin();
    expect(plugin.name).toBe('vite-plugin-aux');
    expect(plugin.enforce).toBe('pre');
  });

  it('resolves virtual style requests and SWC standard decorator helpers', () => {
    const plugin = auxPlugin();
    const resolveId = plugin.resolveId as (id: string) => string | null;
    const styleRes = resolveId.call({}, '/src/button.aux?aux&type=style&index=0.css');
    expect(styleRes).toBe('/src/button.aux?aux&type=style&index=0.css');

    const swcHelperRes = resolveId.call({}, '@swc/helpers/_/_apply_decs_2311');
    expect(swcHelperRes).toContain('_apply_decs_2311.js');
  });

  it('transforms .aux file and caches virtual styles', async () => {
    const plugin = auxPlugin();
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => Promise<{ code: string; map: unknown } | null>;
    const load = plugin.load as (id: string) => string | null;

    const auxCode = `
<template>
  <button>\${label}</button>
</template>

<script lang="ts">
export class Button {
  label = 'Click';
}
</script>

<style scoped>
button { color: green; }
</style>
`;
    const transformRes = await transform.call({}, auxCode, '/src/button.aux');
    expect(transformRes).not.toBeNull();
    expect(transformRes!.code).toContain('CustomElement');
    expect(transformRes!.code).toContain('au-button');

    // Test load hook for the virtual CSS request
    const cssContent = load.call({}, '/src/button.aux?aux&type=style&index=0.css');
    expect(cssContent).toContain('button[data-au-');
    expect(cssContent).toContain('color: green;');
  });

  it('compiles @bindable using TC39 2023-11 standard decorators compatible with Aurelia 2 runtime', async () => {
    const plugin = auxPlugin();
    const resolveId = plugin.resolveId as (id: string) => string | null;
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => Promise<{ code: string; map: unknown } | null>;

    const auxCode = `
<template><div>\${msg}</div></template>
<script lang="ts">
import { bindable } from 'aurelia';
export class TestComponent {
  @bindable msg: string = 'hello';
  @bindable count: number = 42;
}
</script>
`;
    const res = await transform.call({}, auxCode, '/src/test-comp.aux');
    expect(res).not.toBeNull();
    expect(res!.code).not.toContain('@bindable');
    expect(res!.code).toContain('_apply_decs_2311');
    expect(res!.code).toContain('TestComponent');

    // Resolve bare imports so the compiled ESM module can be imported natively
    const helperPath = resolveId.call({}, '@swc/helpers/_/_apply_decs_2311')!;
    const aureliaUrl = import.meta.resolve('aurelia');
    const runnableEsm = res!.code
      .replaceAll('"@swc/helpers/_/_apply_decs_2311"', JSON.stringify(helperPath))
      .replaceAll("'aurelia'", JSON.stringify(aureliaUrl))
      .replaceAll('"aurelia"', JSON.stringify(aureliaUrl));

    const dataUrl = `data:text/javascript;base64,${Buffer.from(runnableEsm).toString('base64')}`;
    const mod = (await import(dataUrl)) as {
      default: new () => { msg: string; count: number };
      TestComponent: new () => { msg: string; count: number };
    };

    const def = CustomElement.getDefinition(mod.TestComponent);
    expect(def.name).toBe('test-component');
    expect(Object.keys(def.bindables)).toEqual(['msg', 'count']);

    const instance = new mod.TestComponent();
    expect(instance.msg).toBe('hello');
    expect(instance.count).toBe(42);
  });
});
