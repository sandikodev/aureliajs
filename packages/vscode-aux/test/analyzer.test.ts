import { describe, it, expect } from 'bun:test';
import { analyzeAuxDocument } from '../src/analyzer.js';

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
});
