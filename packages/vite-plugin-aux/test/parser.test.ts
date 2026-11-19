import { describe, it, expect } from 'bun:test';
import { parseAux, parseAttrs, createScopeId } from '../src/parser';

describe('createScopeId', () => {
  it('generates consistent deterministic hash for same filename', () => {
    const id1 = createScopeId('/path/to/button.aux');
    const id2 = createScopeId('/path/to/button.aux');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^au-[a-z0-9]+$/);
  });

  it('generates different hash for different filenames', () => {
    const id1 = createScopeId('/path/to/button.aux');
    const id2 = createScopeId('/path/to/card.aux');
    expect(id1).not.toBe(id2);
  });
});

describe('parseAttrs', () => {
  it('parses boolean and string attributes', () => {
    const attrs = parseAttrs('lang="ts" scoped containerless name="my-button"');
    expect(attrs['lang']).toBe('ts');
    expect(attrs['scoped']).toBe(true);
    expect(attrs['containerless']).toBe(true);
    expect(attrs['name']).toBe('my-button');
  });
});

describe('parseAux', () => {
  it('parses full component with template, script, and style', () => {
    const sfc = `
<template>
  <button click.trigger="click()">\${label}</button>
</template>

<script lang="ts">
import { bindable } from 'aurelia';

export class MyButton {
  @bindable label = 'Hi';
}
</script>

<style scoped>
button {
  color: red;
}
</style>
`;
    const res = parseAux(sfc, '/src/my-button.aux');
    expect(res.template).not.toBeNull();
    expect(res.template?.content.trim()).toBe('<button click.trigger="click()">${label}</button>');
    expect(res.script).not.toBeNull();
    expect(res.script?.lang).toBe('ts');
    expect(res.script?.content).toContain('export class MyButton');
    expect(res.styles.length).toBe(1);
    expect(res.styles[0]?.scoped).toBe(true);
    expect(res.styles[0]?.content.trim()).toBe('button {\n  color: red;\n}');
  });

  it('handles nested <template> tags inside <template>', () => {
    const sfc = `
<template containerless>
  <div class="card">
    <template if.bind="isExpanded">
      <p>Expanded content</p>
    </template>
  </div>
</template>

<script lang="ts">
export class MyCard {
  isExpanded = true;
}
</script>
`;
    const res = parseAux(sfc, '/src/my-card.aux');
    expect(res.template).not.toBeNull();
    expect(res.template?.attrs['containerless']).toBe(true);
    expect(res.template?.content).toContain('<template if.bind="isExpanded">');
    expect(res.template?.content).toContain('</template>');
    expect(res.script).not.toBeNull();
  });

  it('handles template-only component without script or style', () => {
    const sfc = `
<template containerless>
  <div class="separator"></div>
</template>
`;
    const res = parseAux(sfc, '/src/separator.aux');
    expect(res.template).not.toBeNull();
    expect(res.template?.content.trim()).toBe('<div class="separator"></div>');
    expect(res.script).toBeNull();
    expect(res.styles.length).toBe(0);
  });
});
