import { describe, test, expect } from 'bun:test';
import { compilePlaygroundExample } from '../src/engine/compiler.js';
import { loadAllExamples } from '../src/examples/loader.js';

describe('All Real Aurelia 2 Playground Examples SSR Verification', () => {
  const examples = loadAllExamples();

  test('01-introduction (hello-world): renders greeting and name without blanks', async () => {
    const ex = examples['hello-world'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Hello, Sandiko!');
    expect(res.rawHtml).toContain('Compiled directly with Aurelia 2');
    expect(res.rawHtml).not.toContain('>, Sandiko!');
  });

  test('02-reactivity (counter-card): renders title, description, and initial count', async () => {
    const ex = examples['counter-card'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Interactive Counter');
    expect(res.rawHtml).toContain('Pre-rendered on Hono server');
    expect(res.rawHtml).toContain('Count: 42');
  });

  test('03-aux-component (counter-widget): compiles .aux SFC with scoped styles and template attributes', async () => {
    const ex = examples['aux-component'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Aurelia in HTML');
    expect(res.rawHtml).toContain('Count: 10');
    expect(res.rawHtml).toContain('State: Normal');
    expect(res.htmlDocument).toContain('.btn-increment[');
    expect(res.rawHtml).toContain('data-au-');
  });

  test('04-props-context (user-profile): evaluates context DTO and renders full profile', async () => {
    const ex = examples['user-profile'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Sandikodev');
    expect(res.rawHtml).toContain('sandiko@example.com');
    expect(res.rawHtml).toContain('Google DeepMind Lab');
    expect(res.rawHtml).toContain('Architect');
  });

  test('05-logic-loops (data-table): evaluates repeat.for without crashing or blank screens', async () => {
    const ex = examples['data-table'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Realtime System Telemetry');
    expect(res.rawHtml).toContain('Memory Heap');
    expect(res.rawHtml).toContain('42.8 MB');
    expect(res.rawHtml).toContain('SSR Latency');
    expect(res.rawHtml).toContain('0.8 ms');
    expect(res.rawHtml).toContain('Hydration Markers');
    expect(res.rawHtml).not.toBe('<div class="ssr-container"></div>');
  });

  test('06-resumable-hydration (resumable-counter): pre-renders all server variables and preserves resumable markers', async () => {
    const ex = examples['resumable-counter'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'resumable',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Resumable Event Counter');
    expect(res.rawHtml).toContain('Pre-rendered with W3C markers');
    expect(res.rawHtml).toContain('100');
    expect(res.rawHtml).not.toContain('${title}');
    expect(res.rawHtml).not.toContain('${description}');
    expect(res.rawHtml).not.toContain('${count}');
    expect(res.rawHtml).toContain('data-au-event="click->increment"');
    expect(res.rawHtml).toContain('data-au-bind="count"');
  });

  test('07-two-way-forms: compiles form controls with bi-directional inputs', async () => {
    const ex = examples['form-controls'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Form Controls');
    expect(res.rawHtml).toContain('Sandikodev');
    expect(res.rawHtml).toContain('Aurelia 2 SSR');
    expect(res.rawHtml).toContain('ACTIVE');
  });

  test('08-binding-behaviors: compiles & debounce timing modifier', async () => {
    const ex = examples['binding-behaviors'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Binding Behaviors');
    expect(res.rawHtml).toContain('aurelia-ssr');
    expect(res.rawHtml).toContain('8 modules');
  });

  test('09-value-converters: compiles pure formatting pipes', async () => {
    const ex = examples['value-converters'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Value Converters');
    expect(res.rawHtml).toContain('AUR-ENTERPRISE-2026');
    expect(res.rawHtml).toContain('Enterprise Pro');
    expect(res.rawHtml).toContain('$499.00 USD');
  });

  test('10-conditional-flow: compiles if.bind conditional structural rendering', async () => {
    const ex = examples['conditional-flow'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Conditional Flow');
    expect(res.rawHtml).toContain('Operational');
    expect(res.rawHtml).toContain('All edge nodes serving Aurelia 2 SSR');
  });

  test('11-contextual-scoping: compiles with.bind contextual nesting', async () => {
    const ex = examples['contextual-scoping'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Contextual Scoping');
    expect(res.rawHtml).toContain('Google DeepMind Laboratory');
    expect(res.rawHtml).toContain('99.999%');
  });

  test('12-component-basics: compiles class getters and bindables', async () => {
    const ex = examples['component-basics'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Component Basics');
    expect(res.rawHtml).toContain('Sandiko Dev');
    expect(res.rawHtml).toContain('SD');
    expect(res.rawHtml).toContain('Principal Systems Architect');
  });

  test('13-dependency-injection: compiles decoupled service injection', async () => {
    const ex = examples['dependency-injection'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Dependency Injection');
    expect(res.rawHtml).toContain('ITelemetryService [HonoEdgeTelemetry]');
    expect(res.rawHtml).toContain('Container.Singleton');
  });

  test('14-content-projection: compiles transclusion with <au-slot>', async () => {
    const ex = examples['content-projection'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Content Projection');
    expect(res.rawHtml).toContain('System Firmware Upgrade');
    expect(res.rawHtml).toContain('Release v2.0-rc2');
  });

  test('15-aux-template-only: compiles pure template SFC with zero JS footprint', async () => {
    const ex = examples['aux-template-only'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'ssr',
      strategy: 'static',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Edge Throughput');
    expect(res.rawHtml).toContain('148.2k');
    expect(res.rawHtml).toContain('+14.6% vs avg');
    expect(res.htmlDocument).toContain('.stat-progress-bar[');
  });

  test('16-resumable-todo: compiles Qwik-like resumable todo application', async () => {
    const ex = examples['resumable-todo'];
    expect(ex).toBeDefined();

    const res = await compilePlaygroundExample({
      exampleId: ex.id,
      files: ex.files,
      mode: 'resumable',
      strategy: 'hydrate',
    });

    expect(res.success).toBe(true);
    expect(res.rawHtml).toContain('Resumable Tasks');
    expect(res.rawHtml).toContain('Compile Aurelia 2 on Hono edge runtime');
    expect(res.rawHtml).toContain('Support .aux Single-File Components');
    expect(res.rawHtml).toContain('Pioneer Enterprise Resumable SSR');
    expect(res.rawHtml).toContain('data-au-event="click->add"');
    expect(res.rawHtml).toContain('data-au-bind="tasks"');
  });
});
