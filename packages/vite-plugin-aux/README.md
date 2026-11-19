# `@aureliajs/vite-plugin-aux`

> **Experimental Community `.aux` Single-File Component (SFC) Compiler for Aurelia 2**  
> *Vite 8 / Oxc, Bun, and esbuild plugins — maintained by Sandikodev ([@sandikodev](https://github.com/sandikodev))*

[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88)](https://aurelia.io)
[![Vite 8](https://img.shields.io/badge/Vite-8%20Oxc-646CFF)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Pernyataan Komunitas & Etika Transparansi (Transparency Notice)

> [!IMPORTANT]
> **Pernyataan Terbuka & Penghormatan untuk Komunitas Resmi:**  
> Proyek format `.aux` dan plugin ini adalah **inisiatif penelitian independen dari komunitas** yang digagas oleh Sandiko (`sandikodev`). Proyek ini **bukan rilis resmi** dari tim inti Aurelia maupun Aurelia Foundation.
>
> Seluruh kebenaran kanonikal, arsitektur inti, standar filosofis, dan kepemimpinan ekosistem Aurelia sepenuhnya berada di bawah otoritas resmi **Rob Eisenberg, Aurelia Core Team, dan maintainer resmi** di [aurelia.io](https://aurelia.io), [github.com/aurelia](https://github.com/aurelia), dan [discourse.aurelia.io](https://discourse.aurelia.io).
>
> Eksperimen ini mengeksplorasi Developer Experience (DX) Single-File Component sambil tetap 100% mengompilasi ke `CustomElement.define(...)` standar Aurelia 2 — tanpa menciptakan runtime proprietary.

---

## 1. Scope & Strict Boundaries

### What `@aureliajs/vite-plugin-aux` OWNS
- Parsing `.aux` Single-File Components (`<template>`, `<script>`, `<script setup>`, `<script server>`, `<style>`, `<style scoped>`) with depth-aware nested `<template>` handling.
- Compiling `.aux` files into **pure canonical Aurelia 2 `CustomElement.define(...)` modules** — zero hidden runtime wrapper!
- Compiling TC39 Stage 3 standard decorators (`2023-11`, e.g. `@bindable`) via `@swc/wasm` + Vite 8 native `transformWithOxc`.
- Strict TypeScript type preservation in `<script setup lang="ts">` (`defineProps<{ title: string; count?: number }>()` emits `public title!: string; public count?: number;`).
- Execution boundary & island metadata emission:
  - `<template client-only>` → `ClassName.clientOnly = true`
  - `<template server-only>` → `ClassName.serverOnly = true`
  - `<template island="visible" root-margin="200px">` → `ClassName.island = { trigger: "visible", rootMargin: "200px" }`
  - `<script server>` → preserved in server builds (`isServer: true`), completely stripped from client bundles!
- Multi-bundler support out of the box: `auxPlugin()` (Vite), `auxBunPlugin()` (Bun runtime & `Bun.build`), and `auxEsbuildPlugin()` (esbuild).

### What `@aureliajs/vite-plugin-aux` Explicitly DOES NOT OWN
- SSR execution (`@aureliajs/ssr`), HTTP routing (`@hono/aurelia`), or hydration scheduling (`@aureliajs/islands`). It only emits standard static metadata consumed cleanly by those packages.
- Replacing canonical Aurelia `.ts` + `.html` files — `.aux` and `.ts`+`.html` interoperate 100% side by side in the same app.

---

## 2. Installation

```bash
bun add -d @aureliajs/vite-plugin-aux
```

---

## 3. Setup by Bundler

### Vite 8 (`vite.config.ts`)
```ts
import { defineConfig } from 'vite';
import { auxPlugin } from '@aureliajs/vite-plugin-aux';
import aurelia from '@aurelia/vite-plugin';

export default defineConfig({
  plugins: [
    // Register auxPlugin before Aurelia conventions
    auxPlugin(),
    aurelia(),
  ],
});
```

### Bun (`preload.ts` / `Bun.build`)
```ts
import { auxBunPlugin } from '@aureliajs/vite-plugin-aux';

// In Bun.build()
await Bun.build({
  entrypoints: ['./src/client.ts'],
  outdir: './public',
  plugins: [auxBunPlugin({ isServer: false })],
});
```

### esbuild
```ts
import { auxEsbuildPlugin } from '@aureliajs/vite-plugin-aux';
// Add auxEsbuildPlugin({ isServer: false }) to esbuild plugins array
```

---

## 4. `.aux` Component Patterns

### 1. Canonical Aurelia Class + TC39 Stage 3 `@bindable` + Scoped Styles
```html
<!-- button.aux -->
<template>
  <button type.bind="type" disabled.bind="disabled" click.trigger="handleClick($event)">
    <au-slot></au-slot>
  </button>
</template>

<script lang="ts">
import { bindable } from 'aurelia';

export class UiButton {
  @bindable type: 'button' | 'submit' = 'button';
  @bindable disabled = false;

  handleClick(event: MouseEvent): void {
    if (this.disabled) event.preventDefault();
  }
}
</script>

<style scoped>
button { user-select: none; }
</style>
```

### 2. Zero-Boilerplate `<script setup lang="ts">` + Strictly Typed `defineProps<T>()`
```html
<!-- pricing-card.aux -->
<template>
  <article>
    <h3>${title}</h3>
    <p>Seats: ${count}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{ title: string; count?: number }>();
</script>
```
Compiles to a clean Aurelia class with `public title!: string; public count?: number;` and auto-registered `bindables`.

### 3. Selective Hydration Island (`<template island="...">`)
```html
<!-- pricing-island.aux -->
<template island="visible" root-margin="200px">
  <section>
    <h2>${plan} Plan</h2>
    <p>Total: $${seats * 15}/mo</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{ plan: string; seats: number }>();
</script>
```
Emits `PricingIsland.island = {"trigger":"visible","rootMargin":"200px"};`, automatically consumed by `@aureliajs/islands/server`'s `renderIsland()`.

### 4. Co-located Server Loader & Actions (`<script server>`)
```html
<!-- post-detail.aux -->
<template>
  <h1>${post.title}</h1>
</template>

<script setup lang="ts">
defineProps<{ post: { title: string } }>();
</script>

<script server lang="ts">
export async function loader(c) {
  return { post: await db.findPost(c.req.param('slug')) };
}
</script>
```
In server builds (`isServer: true`), `loader` is attached as `PostDetail.loader`. In client builds (`isServer: false`), `<script server>` is stripped completely so server secrets/DB imports never enter the browser bundle.

### 5. Template-Only & Shadow DOM / Containerless Components
```html
<!-- divider.aux -->
<template containerless>
  <div role="separator"></div>
</template>

<!-- shadow-badge.aux -->
<template shadow="open">
  <span class="badge"><au-slot></au-slot></span>
</template>
<style>.badge { font-weight: 600; }</style>
```

---

## 5. Editor Support

- **VS Code**: Install the companion extension in [`packages/vscode-aux`](../vscode-aux) or map `"*.aux": "html"` in `files.associations`.
- **Neovim**: `vim.filetype.add({ extension = { aux = "html" } })` with HTML Tree-sitter injections for `<script>` (`typescript`) and `<style>` (`css`).
- **Zed**: `"file_types": { "HTML": ["*.aux"] }`.

---

## 6. Known Limitations & Open Areas for Community Improvement

1. **TypeScript IDE Language Server (`.aux` Volar-style typechecking)**: Currently `packages/vscode-aux` provides TextMate grammar and AST template completions, while full cross-block TypeScript diagnostics inside `<template>` expressions remain an exciting open project for the community.
2. **Full AST Parser for `<script setup>`**: `transformScriptSetup()` uses lightweight structural parsing to keep compile times sub-millisecond. Edge-case JS syntax inside `<script setup>` (e.g., complex destructured exports) is a great target for AST-based hardening via Oxc/SWC.
3. **Source Maps**: Emitting accurate chained source maps from `.aux` lines back to compiled JS for browser DevTools debugging is an open contribution opportunity.

---

## 7. Testing

```bash
cd packages/vite-plugin-aux
bun run build
bun test
```
