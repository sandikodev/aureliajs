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
});
