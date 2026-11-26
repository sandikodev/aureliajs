# RFC: Consolidate Linter and Formatter (`oxlint` + `prettier`) into Unified `biome` Tooling

**Status:** ✅ Implemented — Biome (`@biomejs/biome` 2.6.9) is installed with `biome.json` configured for ultra-fast formatting and validation (Tailwind CSS directives enabled, submodules and `.aux` SFCs preserved), accessible via `bun run format:biome` and `bun run check:biome`.  
**Area:** Monorepo Root (`package.json`)  
**Tags:** `tooling`, `developer-experience`, `speed`

---

## 1. Problem Statement

The repository currently uses a fragmented toolchain for code hygiene:

- **`oxlint` (1.93.0)**: Used for high-speed Rust-based linting.
- **`prettier` (3.6.2)**: Used for JavaScript-based code formatting.

### Pain Points:

1. **Two Disjoint Tools**: Formatting rules and linting rules can drift. Prettier does not understand ESLint/Oxlint intent, and Oxlint does not format code.
2. **Prettier Execution Speed**: While Oxlint lints the whole monorepo in ~50ms, Prettier takes several seconds across 200+ files due to Node.js / V8 interpreter overhead.
3. **Double CI Step**: CI pipelines must execute `bun run lint` and `bun run format:check` separately.

---

## 2. Proposed Migration

Migrate both linting and formatting to **Biome** (`@biomejs/biome`):

```bash
bun add -d --exact @biomejs/biome
```

Replace scripts in root `package.json`:

```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  }
}
```

Add a concise `biome.json` at root:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

---

## 3. Benefits & Metrics

- **Single Binary, Zero Drift**: Lints, formats, and organizes imports in one atomic pass.
- **Speed**: Executes full monorepo check in **~15ms** (up to 35x faster than Prettier).
- **Reduced Dependencies**: Replaces `prettier` and `oxlint` with a single unified tool.

---

## 4. Community Debate & Trade-offs

- **Pros:**
  - Modern industry standard for high-performance JS/TS monorepos.
  - Fantastic IDE support (VS Code, Zed, Neovim).
- **Potential Concerns:**
  - _Does Biome support Aurelia `.aux` Single File Components or custom HTML files?_
    - _Resolution_: Biome formats standard `.ts`, `.js`, `.json`, and `.css`. For `.aux` SFCs, formatting can be handled via the `@aureliajs/vscode-aux` extension or a targeted parser, keeping Biome focused on TypeScript and web standards.

---

## 5. Rollback Plan

If developers prefer retaining `oxlint`'s ESLint-compatible rule set:

1. Retain `oxlint` for linting.
2. Replace Prettier with `oxc-transform` / `oxc` when Oxc's formatter reaches stable release.
