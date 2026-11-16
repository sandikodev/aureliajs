import { describe, test, expect } from 'bun:test';
import { compilePlaygroundExample } from '../src/engine/compiler.js';

describe('Aurelia 2 Playground Dynamic Compiler & Execution Pipeline', () => {
  test('1. Compiles paired convention (.html + .ts) with custom user code and metrics', async () => {
    const result = await compilePlaygroundExample({
      exampleId: 'custom-counter',
      files: {
        'custom-counter.html': '<div class="p-6"><button click.trigger="increment()">Count: ${count}</button></div>',
        'custom-counter.ts': `
          console.log('top level user log');
          export class CustomCounter {
            count = 100;
            increment() {
              console.log('clicked custom button');
              this.count += 5;
            }
          }
        `,
      },
      mode: 'ssr',
      strategy: 'hydrate',
      whitelistAudit: true,
    });

    expect(result.success).toBe(true);
    expect(result.compiledJs).toContain("import { CustomElement } from '@aurelia/runtime-html';");
    expect(result.compiledJs).toContain('CustomCounterDefinition');
    expect(result.htmlDocument).toContain('playground:console');
    expect(result.htmlDocument).toContain("console.log('top level user log');");
    expect(result.metrics.serverMs).toBeGreaterThan(0);
    expect(result.metrics.secretStatus).toBe('CLEAN (0 leaked)');
    expect(result.metrics.xssStatus).toContain('SECURE');
  });

  test('2. Compiles Single-File Component (.aux) using genuine @aureliajs/vite-plugin-aux', async () => {
    const auxCode = `
<template>
  <div class="p-6 max-w-sm">
    <h2>\${title}</h2>
    <button class="btn" click.trigger="increment()">Click Me</button>
  </div>
</template>

<script lang="ts">
export default class AuxWidget {
  title = 'Aurelia in HTML';
  count = 20;
  increment() {
    this.count++;
  }
}
</script>

<style scoped>
.btn {
  background-color: #0ea5e9;
  color: #fff;
}
</style>
    `.trim();

    const result = await compilePlaygroundExample({
      exampleId: 'aux-widget',
      files: {
        'aux-widget.aux': auxCode,
      },
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(result.success).toBe(true);
    expect(result.compiledJs).toContain('import { CustomElement as __au_CE } from \'aurelia\';');
    expect(result.htmlDocument).toContain('btn['); // Scoped CSS attribute
    expect(result.ast.type).toBe('AuxComponentDefinition');
  });

  test('3. Detects sensitive leaked secrets in context DTO during security audit', async () => {
    const result = await compilePlaygroundExample({
      exampleId: 'user-profile',
      files: {
        'user-profile.html': '<div>Profile: ${user.name}</div>',
        'user-profile.ts': 'export class UserProfile { user = { name: "Sandiko" }; }',
        'auth-context.json': JSON.stringify({
          user: { name: 'Sandiko' },
          secretApiKey: 'sk-live-123456789',
        }),
      },
      mode: 'ssr',
      strategy: 'hydrate',
      whitelistAudit: true,
    });

    expect(result.success).toBe(true);
    expect(result.metrics.secretStatus).toContain('WARN: Leaked sensitive key(s): secretApiKey');
  });

  test('4. Real Linter detects unknown Aurelia binding commands and missing ViewModel properties', async () => {
    const result = await compilePlaygroundExample({
      exampleId: 'invalid-binding',
      files: {
        'invalid-binding.html': '<button click.fakeCommand="handleClick()">${unregisteredProperty}</button>',
        'invalid-binding.ts': 'export class InvalidBinding { validProp = 10; }',
      },
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(result.diagnostics.length).toBeGreaterThanOrEqual(2);
    const commandDiag = result.diagnostics.find(d => d.message.includes('fakeCommand'));
    expect(commandDiag).toBeDefined();
    expect(commandDiag?.severity).toBe('warning');

    const propDiag = result.diagnostics.find(d => d.message.includes('unregisteredProperty'));
    expect(propDiag).toBeDefined();
    expect(propDiag?.severity).toBe('error');
  });

  test('5. Real Linter validates Single-File Component (.aux) template against script block', async () => {
    const auxCode = `
<template>
  <button click.trigger="unknownMethod()">\${nonExistentField}</button>
</template>
<script lang="ts">
export default class MyAux {
  count = 1;
}
</script>
    `.trim();

    const result = await compilePlaygroundExample({
      exampleId: 'aux-err',
      files: {
        'aux-err.aux': auxCode,
      },
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(result.diagnostics.length).toBeGreaterThanOrEqual(2);
    expect(result.diagnostics.some(d => d.message.includes('unknownMethod'))).toBe(true);
    expect(result.diagnostics.some(d => d.message.includes('nonExistentField'))).toBe(true);
  });
});
