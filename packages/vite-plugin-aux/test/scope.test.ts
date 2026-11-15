import { describe, it, expect } from 'vitest';
import { scopeCss, injectScopeToTemplate } from '../src/scope';

describe('scopeCss', () => {
  it('scopes class selectors', () => {
    const css = '.btn { color: red; }';
    const scoped = scopeCss(css, 'au-1234');
    expect(scoped).toBe('.btn[data-au-1234] { color: red; }');
  });

  it('scopes element selectors and pseudo-classes', () => {
    const css = 'button:hover { background: blue; }';
    const scoped = scopeCss(css, 'au-1234');
    expect(scoped).toBe('button[data-au-1234]:hover { background: blue; }');
  });

  it('scopes multiple comma-separated selectors', () => {
    const css = 'h1, h2, .title { font-weight: bold; }';
    const scoped = scopeCss(css, 'au-1234');
    expect(scoped).toBe('h1[data-au-1234], h2[data-au-1234], .title[data-au-1234] { font-weight: bold; }');
  });

  it('preserves keyframes and at-rules', () => {
    const css = '@media (min-width: 600px) { .box { padding: 1rem; } }';
    const scoped = scopeCss(css, 'au-1234');
    expect(scoped).toContain('@media (min-width: 600px)');
    expect(scoped).toContain('.box[data-au-1234]');
  });
});

describe('injectScopeToTemplate', () => {
  it('injects data-scopeId attribute into HTML tags', () => {
    const html = '<div class="box"><h1>Title</h1><p>Desc</p></div>';
    const scoped = injectScopeToTemplate(html, 'au-1234');
    expect(scoped).toContain('<div data-au-1234 class="box">');
    expect(scoped).toContain('<h1 data-au-1234>Title</h1>');
    expect(scoped).toContain('<p data-au-1234>Desc</p>');
  });

  it('skips <template> and <au-slot> meta-tags', () => {
    const html = '<au-slot></au-slot><template if.bind="ok"><span>Hi</span></template>';
    const scoped = injectScopeToTemplate(html, 'au-1234');
    expect(scoped).toContain('<au-slot></au-slot>');
    expect(scoped).toContain('<template if.bind="ok">');
    expect(scoped).toContain('<span data-au-1234>Hi</span>');
  });
});
