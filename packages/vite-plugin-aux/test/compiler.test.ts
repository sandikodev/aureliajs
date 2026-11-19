import { describe, it, expect } from 'bun:test';
import { parseAux } from '../src/parser';
import { compileAux, deriveTagName, extractTemplateMeta, toKebabCase, toPascalCase } from '../src/compiler';

describe('Naming utilities', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(toKebabCase('UiButton')).toBe('ui-button');
    expect(toKebabCase('UserProfileCard')).toBe('user-profile-card');
  });

  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('ui-button')).toBe('UiButton');
    expect(toPascalCase('card-header')).toBe('card-header'.split('-').map(p => p[0]!.toUpperCase() + p.slice(1)).join(''));
  });

  it('derives valid HTML Custom Element tag name with hyphen', () => {
    expect(deriveTagName('/src/button.aux')).toBe('au-button');
    expect(deriveTagName('/src/ui-button.aux')).toBe('ui-button');
    expect(deriveTagName('/src/Card.aux')).toBe('au-card');
    expect(deriveTagName('/src/alert.aux', 'UiAlert')).toBe('ui-alert');
  });
});

describe('extractTemplateMeta', () => {
  it('extracts <import>, <bindable>, <containerless>, <use-shadow-dom>, <alias>, and <capture>', () => {
    const raw = `
      <import from="./icon.aux" />
      <bindable name="label" mode="two-way" attribute="btn-label"></bindable>
      <containerless></containerless>
      <use-shadow-dom mode="open"></use-shadow-dom>
      <alias name="custom-btn, primary-btn"></alias>
      <capture></capture>
      <button>\${label}</button>
    `;
    const meta = extractTemplateMeta(raw);
    expect(meta.imports).toEqual(['./icon.aux']);
    expect(meta.bindables['label']).toEqual({
      name: 'label',
      attribute: 'btn-label',
      mode: 6,
    });
    expect(meta.containerless).toBe(true);
    expect(meta.shadowMode).toBe('open');
    expect(meta.aliases).toEqual(['custom-btn', 'primary-btn']);
    expect(meta.capture).toBe(true);
    expect(meta.html).toBe('<button>${label}</button>');
  });
});

describe('compileAux', () => {
  it('compiles component with template and script', () => {
    const sfc = `
<template>
  <button click.trigger="click()">\${label}</button>
</template>

<script lang="ts">
import { bindable } from 'aurelia';

export class UiButton {
  @bindable label = 'Click';
}
</script>
`;
    const descriptor = parseAux(sfc, '/src/ui-button.aux');
    const result = compileAux(descriptor);

    expect(result.code).toContain(`import { CustomElement as __au_CE } from 'aurelia';`);
    expect(result.code).toContain(`const __au_template = "<button click.trigger=\\"click()\\">\${label}</button>";`);
    expect(result.code).toContain(`export class UiButton`);
    expect(result.code).toContain(`name: "ui-button"`);
    expect(result.code).toContain(`export default UiButton;`);
  });

  it('compiles template-only component with template bindables and imports', () => {
    const sfc = `
<template containerless bindable="title, subtitle">
  <import from="./badge.aux" />
  <div class="divider">\${title}</div>
</template>
`;
    const descriptor = parseAux(sfc, '/src/ui-divider.aux');
    const result = compileAux(descriptor);

    expect(result.code).toContain(`import * as __au_dep_0 from "./badge.aux";`);
    expect(result.code).toContain(`export class UiDivider {}`);
    expect(result.code).toContain(`dependencies: [__au_dep_0]`);
    expect(result.code).toContain(`containerless: true`);
    expect(result.code).toContain(`bindables: {"title":{"name":"title"},"subtitle":{"name":"subtitle"}}`);
    expect(result.code).toContain(`name: "ui-divider"`);
    expect(result.code).toContain(`export default UiDivider;`);
  });

  it('compiles scoped styles and injects style import and template attributes', () => {
    const sfc = `
<template>
  <div class="card"><au-slot></au-slot></div>
</template>

<script lang="ts">
export class UiCard {}
</script>

<style scoped>
.card { padding: 1rem; }
</style>
`;
    const descriptor = parseAux(sfc, '/src/ui-card.aux');
    const result = compileAux(descriptor);

    expect(result.code).toContain(`import "/src/ui-card.aux?aux&type=style&index=0.css";`);
    expect(result.styles.length).toBe(1);
    expect(result.styles[0]?.scoped).toBe(true);
    expect(result.styles[0]?.css).toContain('.card[data-au-');
    expect(result.code).toContain('<div data-au-');
  });
});
