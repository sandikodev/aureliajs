# RFC: Purge Precompiled Binary VSIX (`aurelia-aux-0.1.0.vsix`) from Git and Automate CI Release Packaging

**Status:** ✅ Implemented — no `.vsix` file is tracked under `packages/vscode-aux/` (verified with `git ls-files` on 2026-11-23).  
**Area:** `packages/vscode-aux`  
**Tags:** `git-hygiene`, `delete`, `ci-cd`

---

## 1. Problem Statement

A precompiled binary extension package `packages/vscode-aux/aurelia-aux-0.1.0.vsix` (**8,119,637 bytes / ~8.1MB**) is currently tracked in git source control:

```bash
$ git ls-files packages/vscode-aux/aurelia-aux-0.1.0.vsix
packages/vscode-aux/aurelia-aux-0.1.0.vsix
```

### Why is this harmful?

1. **Git Repository Bloat**: Git is an append-only object store. Every time `.vsix` is updated, another 8MB blob is permanently added to `.git/objects/`, increasing clone times for every contributor forever.
2. **Violation of Source Control Conventions**: Compiled binary artifacts belong in GitHub Releases, Open VSX, or the VS Code Marketplace—never in git working trees.
3. **Dead DevDependencies**: `packages/vscode-aux/package.json` contains unused image processing packages (`jpeg-js`, `pngjs`) that were likely added for icon processing during packaging.

---

## 2. Proposed Migration

1. **Delete Binary and Untrack**:
   ```bash
   git rm packages/vscode-aux/aurelia-aux-0.1.0.vsix
   ```
2. **Add to `.gitignore`**:
   Ensure `*.vsix` is ignored across all packages.
3. **Remove Dead DevDependencies**:
   Remove `jpeg-js` and `pngjs` from `packages/vscode-aux/package.json`.
4. **Automate via GitHub Actions**:
   Create a release workflow (`.github/workflows/release-vscode-aux.yml`):
   ```yaml
   name: Release VS Code Extension
   on:
     push:
       tags:
         - 'vscode-aux-v*'
   jobs:
     publish:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v2
         - run: bun install
         - run: cd packages/vscode-aux && bunx @vscode/vsce package
         - uses: softprops/action-gh-release@v2
           with:
             files: packages/vscode-aux/*.vsix
   ```

---

## 3. Benefits & Metrics

- **Immediate Git Savings**: 8.1MB removed from the working tree.
- **Clean CI/CD Pipeline**: Automated reproducible extension packaging.
- **Cleaner Package Manifest**: Dead dependencies removed.

---

## 4. Community Debate & Trade-offs

- **Pros:**
  - 100% standard open-source practice.
  - Zero repository bloat.
- **Potential Concerns:**
  - _How can developers test the extension locally without building?_
    - _Resolution_: Developers can run `bun run package` in `packages/vscode-aux/` to generate the `.vsix` locally on demand, or press `F5` in VS Code to launch the extension debugging host directly from source.

---

## 5. Rollback Plan

The `.vsix` can be regenerated at any time in under 2 seconds:

```bash
cd packages/vscode-aux && bunx @vscode/vsce package
```

There is zero data loss risk.
