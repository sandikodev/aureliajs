# @aureliajs/islands — Universal Islands Architecture for Aurelia 2

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Aurelia 2](https://img.shields.io/badge/Aurelia-2.0.0--rc.2-ed2b88.svg)](https://aurelia.io/)
[![Maintained by Sandikodev](https://img.shields.io/badge/Maintained%20by-Sandikodev-10b981.svg)](https://github.com/sandikodev)

**@aureliajs/islands** brings true **Islands Architecture** and seamless **Multi-Frontend Integration** to **Aurelia 2**, adhering strictly to Aurelia's founding principle: **Convention over Configuration**.

Maintained with ❤️ by **Sandikodev ([@sandikodev](https://github.com/sandikodev))**.

---

## 🌟 Why @aureliajs/islands?

In large enterprise applications, legacy or heterogeneous systems often require running multiple frontend technologies within a single unified host shell:
* Migrating gradually from React to Aurelia or vice versa.
* Embedding specialized high-performance widgets (SolidJS fine-grained signals, Svelte 5 runes).
* Using existing design system components written in Vue 3 or Preact.
* Utilizing Qwik for instant resumable components.

Historically in Aurelia 2, developers had to write manual, bloated wrapper Custom Elements for every single component. **@aureliajs/islands** eliminates all glue code boilerplate.

---

## 🚀 Key Features

* ✨ **Zero-Boilerplate Universal Island (`<aurelia-island>`)**: One element to rule them all.
* 🔄 **Bi-directional Reactive Bridge**: Connects Aurelia's Two-Way Data Binding (`@bindable`) with foreign reactive engines without destroying the DOM lifecycle.
* 📦 **Out-of-the-Box Framework Adapters**:
  - ⚛️ **React 18 & 19** (`ReactDOM.createRoot`)
  - 🟢 **Vue 3** (`createApp` with reactive proxy props)
  - 🟠 **Svelte 5** (`mount()` with `$state` runes)
  - 🔵 **SolidJS** (`render()` with fine-grained `createSignal`)
  - 🟣 **Preact** (`render()` with lightweight VDOM)
  - ⚡ **Qwik** (`render()` with resumable JSX)
* 🔌 **Extensible Adapter Registry**: Plug in Web Components, Angular Elements, or custom web runtimes effortlessly.

---

## 📦 Installation

```bash
# Using bun
bun add @aureliajs/islands

# Using pnpm
pnpm add @aureliajs/islands

# Using npm
npm install @aureliajs/islands
```

---

## 🛠️ Quickstart

### 1. Register Plugin in Aurelia 2 Startup

```ts
import Aurelia from 'aurelia';
import { IslandsConfiguration } from '@aureliajs/islands';
import { MyApp } from './my-app';

Aurelia
  .register(IslandsConfiguration)
  .app(MyApp)
  .start();
```

### 2. Use Universal Island in Your HTML Templates

```html
<!-- Vue 3 Island -->
<aurelia-island 
  type="vue" 
  component.bind="VueCounter" 
  props.bind="{ value: count }" 
  on-update.bind="handleIslandUpdate">
</aurelia-island>

<!-- React 19 Island -->
<aurelia-island 
  type="react" 
  component.bind="ReactCounter" 
  props.bind="{ value: count }" 
  on-update.bind="handleIslandUpdate">
</aurelia-island>

<!-- Svelte 5 Island -->
<aurelia-island 
  type="svelte" 
  component.bind="SvelteCounter" 
  props.bind="{ value: count }" 
  on-update.bind="handleIslandUpdate">
</aurelia-island>

<!-- SolidJS Island -->
<aurelia-island 
  type="solid" 
  component.bind="SolidCounter" 
  props.bind="{ value: count }" 
  on-update.bind="handleIslandUpdate">
</aurelia-island>
```

---

## 🧪 Testing

Run automated tests via Vitest:

```bash
bun test packages/aurelia-islands
```

---

## 🤝 Community & Contribution

This package is intended as an open contribution from **Sandikodev** to the global Aurelia community. We welcome PRs, discussions, and feature requests.

* **Author**: Sandikodev <androxoss@hotmail.com>
* **Repository**: [https://github.com/sandikodev](https://github.com/sandikodev)
* **License**: MIT
