# AUX: Single-File Component Tooling for Aurelia 2 (VS Code Extension)

<p align="center">
  <img src="./images/hero-banner.png" alt="Aurelia AUX - Next-Gen Single-File Components" width="100%" />
</p>

> **A Community Developer Experience (DX) Exploration for Aurelia 2**  
> *Author: Sandiko ([@sandikodev](https://github.com/sandikodev))*

[![Visual Studio Marketplace Version](https://img.shields.io/badge/VS_Code_Extension-v0.2.0-blue.svg)](https://marketplace.visualstudio.com)
[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88)](https://aurelia.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Community Transparency & Upstream Alignment

> **Authority & Governance Notice:**  
> The `.aux` Single-File Component (SFC) specification, this Visual Studio Code extension, and associated bundler plugins (`@aureliajs/vite-plugin-aux`) are **independent research and engineering initiatives** authored by Sandiko (`@sandikodev`) as part of the broader Aurelia community.
>
> This project is **not an official release** from the Aurelia Core Team or the Aurelia Foundation.
> 
> Canonical authority, core runtime architecture, design standards, and governance of the Aurelia ecosystem reside with **Rob Eisenberg, the Aurelia Core Team, and official maintainers** at:
> - **Official Website**: [aurelia.io](https://aurelia.io)
> - **Source Repository**: [github.com/aurelia](https://github.com/aurelia)
> - **Community Discourse**: [discourse.aurelia.io](https://discourse.aurelia.io)
>
> Our long-term goal is to validate this DX pattern in production, gather empirical feedback from teams, and submit the specification and compiler findings as an RFC / upstream contribution to the official Aurelia project.

---

## 2. Background & Architectural Vision

Aurelia 2 is built on high-performance observation, open web standards, and an elegant dependency injection architecture. Traditionally, Aurelia follows a paired-file convention: `.ts` for ViewModel logic and `.html` for template view structure.

When developing dense, highly granular UI component libraries (such as design system buttons, badges, popovers, and avatars), developers face two compromises:
1. **Paired-File Fragmentation**: Creating two separate files for a 15-line component splits mental context and multiplies file navigation overhead.
2. **Backtick String Templates**: Inlining templates inside TypeScript (`template: \`...\``) degrades developer ergonomics, lacks syntax highlighting, and sacrifices template type validation.

The **`.aux`** format (**AU**relia + **X**HTML/XML) bridges this gap:
- Unifies `<template>`, `<script lang="ts">`, and `<style scoped>` within a **single cohesive file**.
- Eliminates messy template strings from TypeScript files.
- Preserves native compilation semantics via `@aureliajs/vite-plugin-aux` with **zero runtime overhead**.

---

## 3. Extension Capabilities

- **Pure TypeScript Language Server Integration**:  
  `<script lang="ts">` blocks are evaluated directly through the VS Code TypeScript Language Server, eliminating false-positive JavaScript validator warnings (*"Type annotations can only be used in TypeScript files"*).
- **Aurelia 2 Syntax Highlighting**:  
  Precise grammar recognition for Aurelia binding commands:
  - Commands: `.bind`, `.trigger`, `.for`, `.attr`, `.class`, `.style`, `.one-time`, `.two-way`.
  - Interpolation expressions: `${expression}`.
- **Embedded CSS & Scoped Styles**:  
  Complete syntax highlighting and bracket matching for `<style>` and `<style scoped>` blocks.
- **Custom Explorer File Icon**:  
  Distinctive violet-cyan gradient icon in the VS Code File Explorer to immediately differentiate `.aux` files from generic markup.
- **Auto-Closing & Bracket Matching**:  
  Smart auto-completion for HTML tags, `<!-- -->` comments, and Aurelia expression delimiters.

---

## 4. Anatomy of an `.aux` Component

```html
<template containerless>
  <div role="separator" class.bind="classes"></div>
</template>

<script lang="ts">
import { bindable } from 'aurelia';
import { cn } from '@/lib/utils';

export class UiSeparator {
  @bindable orientation: 'horizontal' | 'vertical' = 'horizontal';

  get classes(): string {
    return cn(
      'shrink-0 bg-border',
      this.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    );
  }
}
</script>

<style scoped>
div {
  transition: opacity 0.2s ease;
}
</style>
```

---

## 5. End-to-End Installation & Reproduction Guide

### Option A: Install from Local Build (VSIX)

1. Clone the repository and navigate to the extension package:
   ```bash
   git clone https://github.com/sandikodev/aureliajs.git
   cd aureliajs/packages/vscode-aux
   ```

2. Install dependencies and compile the extension:
   ```bash
   bun install
   bun run compile
   ```

3. Package into a `.vsix` bundle:
   ```bash
   bunx @vscode/vsce package
   ```

4. Install the generated `.vsix` file into Visual Studio Code:
   ```bash
   code --install-extension vscode-aux-0.2.0.vsix
   ```

### Option B: Running in VS Code Debug Host

1. Open the repository root or `packages/vscode-aux` in Visual Studio Code.
2. Press `F5` (or go to **Run and Debug** -> Select **Launch Extension**).
3. A new **Extension Development Host** window will open with the `.aux` language grammar loaded.
4. Open any project containing `.aux` files to verify syntax highlighting, code folding, and bracket matching.

---

## 6. Project Structure

```
packages/vscode-aux/
├── images/
│   ├── hero-banner.png        # Extension banner for marketplace
│   └── icon.png               # Distinctive file and extension icon
├── language-configuration.json # Auto-closing pairs and comment rules
├── package.json               # Extension manifest and grammar bindings
├── syntaxes/
│   └── aux.tmLanguage.json    # TextMate grammar for Aurelia 2 SFC
├── tsconfig.json              # TypeScript compilation config
└── README.md                  # Professional documentation
```

---

## 7. Community Feedback & Contributing

We welcome technical discourse, bug reports, and architectural reviews from both Aurelia application developers and core framework maintainers.

- **Author**: Sandiko ([@sandikodev](https://github.com/sandikodev))
- **Issue Tracker**: [GitHub Issues](https://github.com/sandikodev/aureliajs/issues)
- **License**: MIT
