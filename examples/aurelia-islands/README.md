# Aurelia 2 Zero-JS Islands Scaffold

Canonical, minimal reference scaffold demonstrating **Zero-JS Selective Hydration** with Aurelia 2 and `@aureliajs/islands`.

Designed for the Aurelia community as a simple, reproducible scaffold that can be cloned and run in seconds.

---

## 🌟 Core Concepts

1. **HTML-First Zero-JS SSR**:
   Above-the-fold content ships as pure static HTML5. Initial page load requires **0 KB** of the heavy Aurelia runtime.
2. **Micro Island Loader (~1.28 KB gzipped)**:
   The browser only downloads `/island-loader.js`, which observes elements matching `[data-au-island]`.
3. **On-Demand Selective Hydration**:
   Interactive island chunks (e.g. `/islands/pricing.js`) are fetched and hydrated **ONLY** when their trigger condition fires (e.g. `data-au-island="visible"` via `IntersectionObserver`).

---

## 🚀 Quick Start

```bash
# 1. Enter the example directory
cd examples/aurelia-islands

# 2. Build the client island bundles (~30ms)
bun run build

# 3. Start the dev server
bun run dev
```

Visit **http://localhost:3006** in your browser.

---

## 📁 Scaffold Architecture

```
examples/aurelia-islands/
├── src/
│   ├── components/
│   │   ├── pricing-island.html     # Island component template
│   │   └── pricing-island.ts       # Island ViewModel with static trigger metadata
│   ├── islands/
│   │   └── pricing.ts              # Client hydration entrypoint for the island
│   ├── pages/
│   │   ├── islands.html            # Static page shell layout
│   │   └── islands.ts              # Page component loading the pre-rendered island
│   ├── island-loader.ts            # ~1.28 KB micro-loader using observeIslands()
│   └── server.ts                   # Pure native Bun.serve SSR HTTP server
├── public/
│   ├── island-loader.js            # Compiled micro-loader bundle
│   ├── islands/
│   │   └── pricing.js              # Compiled island bundle (lazy-loaded on viewport entry)
│   └── style.css                   # Minimal styling
├── scripts/
│   └── build.ts                    # Bun.build bundler script
├── test/
│   └── aurelia-islands.test.ts     # Automated integration test suite
├── package.json
└── tsconfig.json
```

---

## 💡 How It Works

### 1. Define Island with Trigger Metadata
```typescript
// src/components/pricing-island.ts
import { customElement, bindable } from 'aurelia';
import template from './pricing-island.html';

@customElement({ name: 'pricing-island', template })
export class PricingIsland {
  // Configures selective hydration when scrolled into view
  public static readonly island = { trigger: 'visible', rootMargin: '200px' } as const;

  @bindable public plan: string = 'Pro';
  @bindable public seats: number = 5;

  public addSeat(): void {
    this.seats++;
  }
}
```

### 2. Pre-Render Island on Server
```typescript
// src/pages/islands.ts
import { renderIsland } from '@aureliajs/islands/server';
import { PricingIsland } from '../components/pricing-island.js';

const pricingIslandHtml = await renderIsland({
  component: PricingIsland,
  src: '/islands/pricing.js',
  props: { plan: 'Pro', seats: 5 },
});
```

The resulting HTML looks like:
```html
<pricing-island data-au-island="visible" data-au-root-margin="200px" data-au-src="/islands/pricing.js">
  <script type="application/json" data-au-island-data>{"props":{"plan":"Pro","seats":5}}</script>
  <section class="pricing-island">
    <h2>Pro Plan</h2>
    <p>Seats: 5 — Total: $75/mo</p>
    <button type="button">Add Seat (+1)</button>
  </section>
</pricing-island>
```

### 3. Client Hydration Loader
```typescript
// src/island-loader.ts
import { observeIslands } from '@aureliajs/islands/loader';

// Watches for [data-au-island] elements and downloads their bundle only on trigger
observeIslands();
```

---

## 🧪 Testing

```bash
bun test
```
Runs the automated test suite verifying SSR output, state serialization, and HTTP endpoints.
