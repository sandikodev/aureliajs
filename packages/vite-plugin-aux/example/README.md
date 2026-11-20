# Aurelia 2 Single-File Component (`.aux`) Reference

> **Zero Boilerplate Single-File Components for Aurelia 2.**  
> Powered by the `@aureliajs/vite-plugin-aux` compiler, consolidating `<template>`, `<script setup>`, `<script server>`, and `<style scoped>` into a single unified `.aux` file.

[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88)](https://aurelia.io)
[![Vite 8](https://img.shields.io/badge/Vite-8%20Oxc-646CFF)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Architectural Overview

The `.aux` Single-File Component format provides high Developer Experience (DX) for Aurelia 2 applications without introducing a proprietary runtime:

1. **`<script setup lang="ts">`**:
   - Top-level variables automatically become reactive ViewModel properties.
   - Top-level functions automatically bind to template triggers (`click.trigger="refresh()"`).
   - Typed props via `defineProps<{ title: string; count?: number }>()` are compiled to standard `@bindable` properties.
2. **`<script server lang="ts">`**:
   - Executes exclusively on the server during SSR (data loaders: `static async loader()`, route metadata).
   - Completely stripped (**zero footprint**) from client browser bundles to prevent sensitive server logic or credentials from leaking.
3. **Execution Boundaries**:
   - `<template client-only>`: Skips server rendering, mounting exclusively on the client.
   - `<template server-only>`: Renders static HTML on the server and is stripped from client hydration bundles.
   - `<template island="visible">`: Generates selective hydration metadata for `@aureliajs/islands`.
4. **Scoped Styles (`<style scoped>`)**:
   - Automatically scopes CSS rules to component elements using unique attribute selectors.

---

## 2. Component Anatomy

```html
<!-- src/pages/dashboard.aux -->
<template>
  <div class="dashboard">
    <header>
      <h1>${title}</h1>
      <button click.trigger="refreshData()">Refresh</button>
    </header>

    <template client-only>
      <div class="client-telemetry">Client Rendered Telemetry</div>
    </template>

    <template island="visible">
      <pricing-island plan="Enterprise" seats.bind="10"></pricing-island>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from './data';

const title = 'Executive Dashboard';
let counter = 0;

function refreshData() {
  counter++;
}
</script>

<script server lang="ts">
export async function loader() {
  return { stats: await fetchServerStats() };
}
</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
button {
  cursor: pointer;
}
</style>
```

---

## 3. Directory Structure

```
examples/aurelia-aux/
├── package.json               # Dependencies and build scripts
├── tsconfig.json              # TypeScript compilation configuration
├── vite.config.ts             # Vite configuration with @aureliajs/vite-plugin-aux
└── src/
    ├── main.ts                # Application entrypoint
    ├── env.d.ts               # Module declarations for .aux files
    ├── data.ts                # Shared state & mock services
    ├── components/
    │   └── pricing-island.aux # Selective hydration island component
    └── pages/
        ├── home.aux           # Home page component
        ├── dashboard.aux      # Protected dashboard component
        ├── islands.aux        # Islands showcase page
        └── post-detail.aux    # Dynamic route component with server loader
```

---

## 4. End-to-End Reproduction & Execution Guide

### Prerequisites
- [Bun](https://bun.sh) (v1.2+) or Node.js (v20+)

### Step 1: Install Dependencies
From the repository root:
```bash
bun install
```

### Step 2: Build the Compiler Plugin
Ensure `@aureliajs/vite-plugin-aux` is compiled:
```bash
bun run --cwd packages/vite-plugin-aux build
```

### Step 3: Run Unit & Integration Tests
Verify that all `.aux` compiler tests pass:
```bash
bun run --cwd examples/aurelia-aux test
```

### Step 4: Run Type Checking
Verify strict TypeScript compilation:
```bash
bun run --cwd examples/aurelia-aux typecheck
```

### Step 5: Start the Development Server
Launch the Vite development server:
```bash
bun run --cwd examples/aurelia-aux dev
```

Open `http://localhost:5173` to explore the live `.aux` Single-File Component demo.

---

## 5. License

MIT © [Sandikodev](https://github.com/sandikodev)
