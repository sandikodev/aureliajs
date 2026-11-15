# @aureliajs/vite-plugin-aux

> **Experimental Community Vite Plugin for Aurelia 2 `.aux` Single-File Components (SFC)**  
> *Riset & Eksplorasi oleh Sandiko ([@sandikodev](https://github.com/sandikodev))*

---

## 🕊️ Pernyataan Komunitas & Etika Transparansi (Transparency Notice)

> [!IMPORTANT]
> **Pernyataan Terbuka & Penghormatan untuk Komunitas Resmi:**  
> Proyek format `.aux` dan plugin ini adalah **inisiatif penelitian independen dari komunitas** yang digagas oleh Sandiko (`sandikodev`).
> 
> Proyek ini **bukan rilis resmi** dari tim inti Aurelia maupun Aurelia Foundation.
> 
> Seluruh kebenaran kanonikal, arsitektur inti, standar filosofis, dan kepemimpinan ekosistem Aurelia sepenuhnya dan selamanya berada di bawah otoritas resmi **Rob Eisenberg, Aurelia Core Team, dan maintainer resmi** di:
> - **Situs Resmi**: [aurelia.io](https://aurelia.io)
> - **Repositori Resmi**: [github.com/aurelia](https://github.com/aurelia)
> - **Forum & Komunitas**: [discourse.aurelia.io](https://discourse.aurelia.io)
> 
> Eksperimen ini semata-mata merupakan eksplorasi Developer Experience (DX) di tingkat komunitas. Jika eksplorasi format Single-File Component ini terbukti matang, stabil, dan dinilai bermanfaat oleh komunitas luas, seluruh hasil riset ini akan diajukan secara santun dan hormat sebagai bahan pertimbangan (RFC / kontribusi) kepada tim inti Aurelia.

---

## 🌟 Features

- **Intuitive SFC Format**: `<template>`, `<script lang="ts">`, and `<style scoped>` in one clean `.aux` file.
- **Template-Only Components**: Write simple visual wrappers or SVG icons using only `<template>` without writing boilerplate `<script>` classes.
- **Zero-Boilerplate Custom Elements**: Automatically infers component class names and generates W3C-compliant custom element tag names (e.g. `button.aux` -> `<au-button>`).
- **Scoped Styles**: CSS encapsulation using automatic attribute scoping (`data-au-[hash]`) or native Shadow DOM (`<template shadow>`).
- **Vite 8 & Rolldown Ready**: Ultra-fast transformations powered by Vite 8 OXC/esbuild compiler with full decorator support (`@bindable`).
- **Fine-Grained HMR**: Instant Hot Module Replacement for style and template updates.

---

## 📦 Installation

```bash
pnpm add -D @aureliajs/vite-plugin-aux
```

---

## 🚀 Quick Setup in `vite.config.ts`

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

---

## 📝 `.aux` Component Anatomy

### 1. Interactive Component with TypeScript & Scoped Styles

```html
<!-- button.aux -->
<template>
  <button
    type.bind="type"
    class.bind="classes"
    disabled.bind="disabled || loading"
    click.trigger="handleClick($event)"
  >
    <svg if.bind="loading" class="spinner" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"></circle>
    </svg>
    <au-slot></au-slot>
  </button>
</template>

<script lang="ts">
import { bindable } from 'aurelia';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export class UiButton {
  @bindable variant: VariantProps<typeof buttonVariants>['variant'] = 'default';
  @bindable type: 'button' | 'submit' = 'button';
  @bindable disabled = false;
  @bindable loading = false;

  get classes(): string {
    return cn(buttonVariants({ variant: this.variant }));
  }

  handleClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
    }
  }
}
</script>

<style scoped>
button {
  user-select: none;
}
.spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

### 2. Template-Only Component

No script needed! The compiler creates an anonymous class and registers the custom element automatically:

```html
<!-- divider.aux -->
<template containerless>
  <div class="h-px w-full bg-border" role="separator"></div>
</template>
```

---

## 🛠️ Editor Support

### Neovim / LunarVim

Add the filetype mapping to your Lua config (e.g. `~/.config/nvim/lua/config/filetype.lua` or `init.lua`):

```lua
vim.filetype.add({
  extension = {
    aux = "html", -- mapped to html parser with Tree-sitter injections
  },
})
```

For Tree-sitter embedded injections (`queries/html/injections.scm`):
```scheme
((element
  (start_tag (tag_name) @_tag)
  (text) @injection.content)
 (#eq? @_tag "script")
 (#set! injection.language "typescript"))

((element
  (start_tag (tag_name) @_tag)
  (text) @injection.content)
 (#eq? @_tag "style")
 (#set! injection.language "css"))
```

### Zed Editor

In `~/.config/zed/settings.json`:
```json
{
  "file_types": {
    "HTML": ["*.aux"]
  }
}
```

### VS Code

In `.vscode/settings.json` or user settings:
```json
{
  "files.associations": {
    "*.aux": "html"
  }
}
```

---

## 🧪 Testing

```bash
pnpm test
```

21 unit tests covering:
- Depth-aware `<template>` block parsing (handles nested `<template if.bind="...">`).
- `<script lang="ts">` extraction and decorator transpile.
- Scoped CSS selector rewriting (`scopeCss`).
- Template attribute injection (`injectScopeToTemplate`).
- W3C Custom Element tag naming compliance.
- Vite plugin hooks (`resolveId`, `load`, `transform`, `handleHotUpdate`).

---

## 📄 License

MIT
