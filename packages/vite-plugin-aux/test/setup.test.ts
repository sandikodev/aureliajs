import { describe, it, expect } from 'vitest';
import { parseAux } from '../src/parser.js';
import { compileAux } from '../src/compiler.js';

describe('.aux SFC compiler - Script Setup, Execution Boundaries, & Co-located Server Loaders', () => {
  it('parses and compiles <script setup> with auto-inferred bindables and methods', () => {
    const auxCode = `
<template>
  <div class="user-badge">
    <h2>\${title}</h2>
    <span>Count: \${count}</span>
    <button click.trigger="increment()">Increment</button>
  </div>
</template>

<script setup lang="ts">
import { resolve } from 'aurelia';

let title: string = 'Welcome';
let count: number = 0;
let _privateState = 'hidden';

function increment() {
  this.count++;
}

function attached() {
  console.log('Badge attached');
}
</script>
`;

    const descriptor = parseAux(auxCode, '/src/components/UserBadge.aux');
    expect(descriptor.setupScript).toBeDefined();
    expect(descriptor.setupScript?.content).toContain('let title: string = \'Welcome\';');

    const result = compileAux(descriptor);
    // Bindables should be auto-inferred without <template bindable="...">
    expect(result.code).toContain('"title":{"name":"title"}');
    expect(result.code).toContain('"count":{"name":"count"}');
    // Private _-prefixed state should NOT be in bindables
    expect(result.code).not.toContain('"_privateState"');

    // Class should be emitted with fields and methods
    expect(result.code).toContain('export class UserBadge {');
    expect(result.code).toContain('public title: string = \'Welcome\';');
    expect(result.code).toContain('public count: number = 0;');
    expect(result.code).toContain('public _privateState = \'hidden\';');
    expect(result.code).toContain('increment()');
    expect(result.code).toContain('attached()');

    // Aurelia CustomElement define should be generated
    expect(result.code).toContain('__au_CE.define({');
    expect(result.code).toContain('name: "user-badge"');
  });

  it('supports defineProps in <script setup>', () => {
    const auxCode = `
<template>
  <h1>\${headline}</h1>
</template>

<script setup>
defineProps(['headline', 'author']);

function read() {
  return true;
}
</script>
`;

    const descriptor = parseAux(auxCode, '/src/ArticleView.aux');
    const result = compileAux(descriptor);

    expect(result.code).toContain('"headline":{"name":"headline"}');
    expect(result.code).toContain('"author":{"name":"author"}');
    expect(result.code).toContain('public headline: any;');
    expect(result.code).toContain('public author: any;');
  });

  it('compiles execution boundaries: <template client-only> and <template server-only>', () => {
    const clientIslandCode = `
<template client-only>
  <canvas id="heavy-3d-chart"></canvas>
</template>

<script>
export class HeavyChart {}
</script>
`;
    const clientDesc = parseAux(clientIslandCode, '/src/HeavyChart.aux');
    const clientResult = compileAux(clientDesc);
    expect(clientResult.code).toContain('HeavyChart.clientOnly = true;');

    const serverIslandCode = `
<template server-only>
  <div class="zero-js-footer">Static Copyright 2026</div>
</template>
`;
    const serverDesc = parseAux(serverIslandCode, '/src/StaticFooter.aux');
    const serverResult = compileAux(serverDesc);
    expect(serverResult.code).toContain('StaticFooter.serverOnly = true;');
  });

  it('handles co-located <script server>: preserves in SSR, strips in client bundle', () => {
    const pageCode = `
<template>
  <div>\${post.title}</div>
</template>

<script setup>
let post = null;
</script>

<script server lang="ts">
export async function loader(c) {
  const slug = c.req.param('slug');
  return { post: { slug, title: 'Server Loaded Post' } };
}
export const requiresAuth = false;
export const title = 'Post Detail';
</script>
`;

    const descriptor = parseAux(pageCode, '/src/pages/PostPage.aux');
    expect(descriptor.serverScript).toBeDefined();

    // 1. SSR Compilation (isServer: true) -> Attaches loader to class
    const ssrResult = compileAux(descriptor, { isServer: true });
    expect(ssrResult.code).toContain('// --- Server-Only Script Block ---');
    expect(ssrResult.code).toContain('PostPage.loader = loader;');
    expect(ssrResult.code).toContain('PostPage.requiresAuth = requiresAuth;');
    expect(ssrResult.code).toContain('PostPage.title = title;');

    // 2. Client Compilation (isServer: false) -> Completely strips server script!
    const clientResult = compileAux(descriptor, { isServer: false });
    expect(clientResult.code).not.toContain('// --- Server-Only Script Block ---');
    expect(clientResult.code).not.toContain('Server Loaded Post');
    expect(clientResult.code).not.toContain('PostPage.loader');
  });

  it('supports getters, setters, type aliases, and exported constants in <script setup>', () => {
    const auxCode = `
<template>
  <button class.bind="classes" click.trigger="toggle()">\${label}</button>
</template>

<script setup lang="ts">
import { cn } from './utils';

export type Variant = 'primary' | 'secondary';
export const buttonTheme = { active: 'bg-blue-500' };

let label: string = 'Click me';
let active: boolean = false;
let value: string = 'test';

get classes(): string {
  return cn('btn', this.active && buttonTheme.active);
}

set classes(val: string) {
  console.log('setting classes', val);
}

function toggle() {
  this.active = !this.active;
}
</script>
`;

    const descriptor = parseAux(auxCode, '/src/FancyButton.aux');
    const result = compileAux(descriptor);

    // Types and consts hoisted and preserved
    expect(result.code).toContain("export type Variant = 'primary' | 'secondary';");
    expect(result.code).toContain("export const buttonTheme = { active: 'bg-blue-500' };");

    // Getters and setters transformed into class members
    expect(result.code).toContain('get classes(): string {');
    expect(result.code).toContain("return cn('btn', this.active && buttonTheme.active);");
    expect(result.code).toContain('set classes(val: string) {');

    // Two-way convention for value
    expect(result.code).toContain('"value":{"name":"value","mode":6}');
    expect(result.code).toContain('"label":{"name":"label"}');
  });

  it('maintains 100% interoperability with canonical Aurelia .ts + .html class pattern', () => {
    const canonicalCode = `
<template>
  <p>\${message}</p>
</template>

<script>
export class CanonicalGreeting {
  message = 'Hello Canonical';
}
</script>
`;

    const descriptor = parseAux(canonicalCode, '/src/CanonicalGreeting.aux');
    const result = compileAux(descriptor);
    expect(result.code).toContain('export class CanonicalGreeting {');
    expect(result.code).toContain('message = \'Hello Canonical\';');
    expect(result.code).toContain('__au_CE.define({');
    expect(result.code).toContain('name: "canonical-greeting"');
  });
});
