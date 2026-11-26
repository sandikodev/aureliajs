# RFC: Eliminate Babel Dependencies from `aurelia-bridge` in Favor of Vite Native / Esbuild

**Status:** ✅ Implemented — Zero Babel dependencies are declared in `package.json` or workspace manifests. SolidJS/foreign framework transforms delegate cleanly to Vite native plugins or optional runtime helpers without hard dependencies.  
**Area:** `packages/aurelia-bridge`, root `package.json`  
**Tags:** `native`, `tooling`, `delete`

---

## 1. Problem Statement

In `packages/aurelia-bridge/src/vite/index.ts`, `@babel/core` and `@babel/preset-typescript` are dynamically imported:

```ts
// 3. SolidJS JSX Components
if (solid && cleanId.includes('solid') && (cleanId.endsWith('.tsx') || cleanId.endsWith('.jsx'))) {
  const babel = await import('@babel/core');
  const transformed = babel.transformSync(code, {
    presets: [
      '@babel/preset-typescript',
      ['babel-preset-solid', { generate: 'dom', hydratable: false }],
    ],
  });
  return { code: transformed?.code ?? '', map: transformed?.map };
}
```

### Why is this an anti-pattern?

1. **Babel in a Modern Vite Environment**: Vite standardizes on `esbuild` and `rolldown`. Embedding a standalone Babel runner inside a Vite plugin is legacy ballast.
2. **Heavy Toolchain Overhead**: `@babel/core` pulls in `@babel/parser`, `@babel/traverse`, `@babel/generator`, `@babel/types`, and `@jridgewell/*`, inflating install times.
3. **Only Used for One Framework (SolidJS)**: React, Vue, Svelte, Lit, and Preact in the bridge do not require Babel.

---

## 2. Proposed Migration

1. **Delegate SolidJS Compilation to Official Plugin**:
   Advise consumers using Solid components to include standard `vite-plugin-solid` in their `vite.config.ts`, or:
2. **Use Esbuild JSX Transform**:
   Use Vite's built-in `transformWithEsbuild(code, id, { jsx: 'automatic' })` for JSX transformation.
3. **Remove Babel from Root & Package Dependencies**:
   Uninstall `@babel/core` and `@babel/preset-typescript`.

---

## 3. Benefits & Metrics

- **Dependencies Removed**: `@babel/core` and `@babel/preset-typescript`.
- **Install Footprint**: ~45MB of Babel packages removed.
- **Dev-Server Cold Start**: Eliminates dynamic Babel transpilation overhead when reloading bridge modules.

---

## 4. Community Debate & Trade-offs

- **Pros:**
  - Pure Vite toolchain without hidden legacy transpilers.
  - Aligns with modern bundler best practices.
- **Potential Concerns:**
  - _Does SolidJS JSX require special compilation?_
    - _Resolution_: SolidJS uses a unique reactive JSX transform (`babel-preset-solid`) that differs from standard React JSX. For users who specifically want SolidJS components inside Aurelia, recommending `vite-plugin-solid` in their Vite config is the standard Vite ecosystem convention.

---

## 5. Rollback Plan

If users require zero-config SolidJS support out-of-the-box without configuring Vite plugins:

1. Revert to dynamic import of `@babel/core` as an optional peerDependency rather than a required monorepo dependency.
