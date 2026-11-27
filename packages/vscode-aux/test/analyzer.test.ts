import { describe, it, expect } from 'bun:test';
import { analyzeAuxDocument } from '../src/analyzer';
import { parseAuxBlocks } from '../src/parser';

describe('Aurelia AUX Analyzer', () => {
  it('analyzes script ViewModel members and template bindings', () => {
    const code = `
<template containerless as-custom-element="ui-label">
  <label for.bind="for" class="select-none"><au-slot></au-slot></label>
  <button click.trigger="handleClick($event)">\${label}</button>
</template>

<script lang="ts">
import { bindable } from 'aurelia';

export class UiLabel {
  @bindable for: string = '';
  @bindable label: string = 'Default';

  get classes(): string {
    return 'label-class';
  }

  handleClick(e: MouseEvent): void {
    console.log(e);
  }
}
</script>
`;

    const analysis = analyzeAuxDocument(code);

    // Verify script analysis
    expect(analysis.script.className).toBe('UiLabel');
    expect(analysis.script.hasScript).toBe(true);

    const members = analysis.script.members;
    expect(members.has('for')).toBe(true);
    expect(members.get('for')?.isBindable).toBe(true);
    expect(members.get('for')?.kind).toBe('property');

    expect(members.has('label')).toBe(true);
    expect(members.get('label')?.isBindable).toBe(true);

    expect(members.has('classes')).toBe(true);
    expect(members.get('classes')?.kind).toBe('getter');

    expect(members.has('handleClick')).toBe(true);
    expect(members.get('handleClick')?.kind).toBe('method');

    // Verify template analysis
    expect(analysis.template.bindings.length).toBe(2);

    const forBinding = analysis.template.bindings.find((b) => b.targetAttribute === 'for');
    expect(forBinding).toBeDefined();
    expect(forBinding?.command).toBe('bind');
    expect(forBinding?.expression).toBe('for');

    const clickBinding = analysis.template.bindings.find((b) => b.targetAttribute === 'click');
    expect(clickBinding).toBeDefined();
    expect(clickBinding?.command).toBe('trigger');
    expect(clickBinding?.expression).toBe('handleClick($event)');

    // Verify interpolations
    expect(analysis.template.interpolations.length).toBe(1);
    expect(analysis.template.interpolations[0]?.expression).toBe('label');
  });

  it('analyzes <script setup> bindings, private state, methods, and <script server> loader properties', () => {
    const sfc = `
<template>
  <article>
    <h1>\${title}</h1>
    <p>\${serverTimestamp}</p>
    <button click.trigger="endorse()">\${points}</button>
  </article>
</template>

<script server lang="ts">
export async function loader() {
  return {
    serverTimestamp: '2026-11-28T00:00:00Z',
  };
}
</script>

<script setup lang="ts">
let title: string = 'Hello';
let points = 0;
let _submitting = false;

function endorse(): void {
  points += 1;
}
</script>
`;

    const analysis = analyzeAuxDocument(sfc);
    expect(analysis.script.hasScript).toBe(true);

    const members = analysis.script.members;
    expect(members.get('title')?.isBindable).toBe(true);
    expect(members.get('title')?.typeString).toBe('string');
    expect(members.get('points')?.isBindable).toBe(true);
    expect(members.get('points')?.typeString).toBe('number');
    expect(members.get('_submitting')?.isBindable).toBe(false);
    expect(members.get('endorse')?.kind).toBe('method');
    expect(members.get('serverTimestamp')?.isBindable).toBe(true);
    expect(members.get('serverTimestamp')?.typeString).toBe('string');
  });

  it('keeps setup bindings when a class script also has import statements', () => {
    const sfc = `
<template><span>\${headline}</span></template>

<script lang="ts">
import { bindable } from 'aurelia';

export class MixedPage {
  @bindable org = 'Aurelia';
}
</script>

<script setup lang="ts">
let headline: string = 'From setup';
</script>
`;

    const analysis = analyzeAuxDocument(sfc);
    expect(analysis.script.className).toBe('MixedPage');
    expect(analysis.script.members.get('org')?.isBindable).toBe(true);
    expect(analysis.script.members.get('headline')?.typeString).toBe('string');
    expect(analysis.script.members.get('headline')?.isBindable).toBe(true);
  });

  it('keeps `>` inside quoted attributes and preserves exact block offsets', () => {
    const sfc = [
      '<template lang="ts" data-note="a>b">',
      '  <p>${msg}</p>',
      '</template>',
      '<script setup lang="ts" data-guard="x > y">',
      "const msg = 'hi';",
      '</script>',
      '<style scoped data-query="a>b">',
      'p{color:red}',
      '</style>',
    ].join('\n');

    const blocks = parseAuxBlocks(sfc);
    expect(blocks.template?.attrs['data-note']).toBe('a>b');
    expect(blocks.template?.content).toContain('<p>');
    expect(blocks.setupScript?.attrs['data-guard']).toBe('x > y');
    expect(sfc.slice(blocks.setupScript!.startOffset, blocks.setupScript!.endOffset)).toBe(
      "\nconst msg = 'hi';\n"
    );
    expect(blocks.styles[0]?.attrs['data-query']).toBe('a>b');
    expect(sfc.slice(blocks.styles[0]!.startOffset, blocks.styles[0]!.endOffset)).toBe(
      '\np{color:red}\n'
    );
  });
});
