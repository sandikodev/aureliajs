import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'bun:test';
import { checkAuxDocument, checkAuxFiles, formatAuxCheckReport } from '../src/check';

describe('aux-check static diagnostic runner', () => {
  it('passes valid bindings across <script>, <script setup>, <script server>, repeat.for, and object literals', () => {
    const sfc = `
<template>
  <section class.bind="{ active: isReady }">
    <h1>\${title}</h1>
    <p>\${serverNote}</p>
    <ul>
      <li repeat.for="item of items">\${item.label} - \${$index}</li>
    </ul>
    <button click.trigger="increment($event)">\${count}</button>
  </section>
</template>

<script server lang="ts">
export const loader = async (): Promise<{ serverNote: string }> => ({
  serverNote: 'Hydrated' as const,
});
</script>

<script setup lang="ts">
let title = 'Hello';
let isReady = true;
let count = 0;
const items = [{ label: 'One' }];

function increment(): void {
  count += 1;
}
</script>
`;

    const result = checkAuxDocument(sfc, 'ValidCard.aux');
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports structured errors and warnings with accurate 1-based line and column locations', () => {
    const sfc = [
      '<template>',
      '  <p>${missingInterp}</p>',
      '  <button click.unknown="handleClick()" click.trigger="missingHandler()">',
      '    <span repeat.for="bad syntax"></span>',
      '  </button>',
      '</template>',
      '',
      '<script lang="ts">',
      'export class BrokenCard {',
      '  label = "ok";',
      '}',
      '</script>',
    ].join('\n');

    const result = checkAuxDocument(sfc, 'BrokenCard.aux');
    expect(result.errorCount).toBe(3);
    expect(result.warningCount).toBe(1);

    const interpDiag = result.diagnostics.find((d) => d.message.includes('missingInterp'));
    expect(interpDiag).toBeDefined();
    expect(interpDiag?.severity).toBe('error');
    expect(interpDiag?.code).toBe('unknown-member');
    expect(interpDiag?.start.line).toBe(2);
    expect(interpDiag?.start.column).toBe(8);

    const unknownCmdDiag = result.diagnostics.find((d) => d.code === 'unknown-binding-command');
    expect(unknownCmdDiag).toBeDefined();
    expect(unknownCmdDiag?.severity).toBe('warning');
    expect(unknownCmdDiag?.start.line).toBe(3);

    const missingMethodDiag = result.diagnostics.find((d) => d.message.includes('missingHandler'));
    expect(missingMethodDiag).toBeDefined();
    expect(missingMethodDiag?.severity).toBe('error');
    expect(missingMethodDiag?.start.line).toBe(3);

    const invalidRepeatDiag = result.diagnostics.find((d) => d.code === 'invalid-repeat');
    expect(invalidRepeatDiag).toBeDefined();
    expect(invalidRepeatDiag?.severity).toBe('error');
    expect(invalidRepeatDiag?.start.line).toBe(4);
  });

  it('validates template-only bindables without false positives and catches unknown interpolations when <script server> is present', () => {
    const templateOnlyOk = checkAuxDocument(
      `<template bindable="title"><bindable name="subtitle" /><h1>\${title}</h1><p>\${subtitle}</p></template>`,
      'Banner.aux',
    );
    expect(templateOnlyOk.errorCount).toBe(0);

    const serverOnlyInvalid = checkAuxDocument(
      `
<template><p>\${serverName}</p><p>\${typoName}</p></template>
<script server lang="ts">
export const loader = () => ({ serverName: 'Aurelia' satisfies string });
</script>
`,
      'ServerOnly.aux',
    );
    expect(serverOnlyInvalid.errorCount).toBe(1);
    expect(serverOnlyInvalid.diagnostics[0]?.message).toContain('typoName');
  });

  it('checks multiple .aux files and directories via checkAuxFiles and formats a report', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aux-check-test-'));
    try {
      const okFile = path.join(tmpDir, 'Ok.aux');
      const badFile = path.join(tmpDir, 'Bad.aux');

      await fs.writeFile(
        okFile,
        `<template><p>\${okProp}</p></template><script setup lang="ts">let okProp = 'yes';</script>`,
        'utf8',
      );
      await fs.writeFile(
        badFile,
        `<template><p>\${ghostProp}</p></template><script setup lang="ts">let realProp = 'yes';</script>`,
        'utf8',
      );

      const summary = await checkAuxFiles([tmpDir]);
      expect(summary.totalFiles).toBe(2);
      expect(summary.errorCount).toBe(1);
      expect(summary.warningCount).toBe(0);
      expect(summary.ok).toBe(false);

      const report = formatAuxCheckReport(summary);
      expect(report).toContain('Bad.aux:1:16 Error [unknown-member]');
      expect(report).toContain('ghostProp');
      expect(report).toContain('aux-check found 1 error(s) and 0 warning(s) across 2 file(s).');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
