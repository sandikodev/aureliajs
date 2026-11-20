# Pure Aurelia 2 Server-Side Rendering (SSR) Reference

> **Zero HTTP Framework Coupling. Pure Native Aurelia 2 Server-Side Rendering & Hydration.**  
> Demonstrating how `@aureliajs/ssr` operates as a framework-agnostic SSR engine running natively on standard W3C `Request` and `Response` interfaces (Bun.serve, Node `http.createServer`, Fastify, Express, or Edge Workers) without requiring Hono or any other meta-framework wrapper.

[![Aurelia 2](https://img.shields.io/badge/Aurelia-v2.0.0--rc.2-ED2B88)](https://aurelia.io)
[![Bun](https://img.shields.io/badge/Bun-v1.2+-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Architectural Philosophy: Pure Separation of Concerns

Aurelia 2 SSR adheres to strict modular decoupling:
1. **`@aureliajs/ssr` Core Engine**: Accepts an Aurelia component class, input props, and request context, returning an isolated HTML string without polluting `globalThis` or leaking state across concurrent HTTP requests.
2. **Framework-Free HTTP Server**: Developers are free to choose any backend runtime or HTTP framework. This example uses native `Bun.serve` operating on standard Web APIs.
3. **Seamless Client Hydration**: Client bundles import from `@aureliajs/ssr/client` to hydrate the server-rendered DOM nodes in-place using Aurelia 2's native `<!--au-->` hydration markers.

---

## 2. Server Rendering Workflow

```ts
import { renderAurelia, createHtmlDocument, type HydrationPayload } from '@aureliajs/ssr';
import { AppRoot } from './components/app-root';

// 1. Render Aurelia component tree to an HTML string with hydration markers
const appHtml = await renderAurelia({
  component: AppRoot,
  props: {
    title: 'Pure Aurelia 2 SSR Engine',
    initialCount: 25,
  },
  url: 'http://localhost:3005/',
  preserveMarkers: true, // Emits <!--au--> comment markers for client hydration
});

// 2. Prepare client hydration payload
const payload: HydrationPayload = {
  component: 'app-root',
  context: {},
  initialData: { title: 'Pure Aurelia 2 SSR Engine', initialCount: 25 },
  timestamp: Date.now(),
};

// 3. Assemble complete HTML5 document shell with inert JSON script data
const fullDocumentHtml = createHtmlDocument(appHtml, payload, {
  title: 'Aurelia 2 Pure SSR Reference',
  cssBundle: '/style.css',
  jsBundle: '/client.js',
});
```

---

## 3. Client Hydration Bootstrap

On the browser, hydration consumes the inert JSON data block (`__AURELIA_SSR_DATA__`) and activates the DOM without re-rendering or layout thrashing:

```ts
import { createClientHydrator } from '@aureliajs/ssr/client';
import { AppRoot } from './components/app-root';

await createClientHydrator({
  components: [AppRoot],
  target: 'app-root',
});
```

---

## 4. Directory Structure

```
examples/aurelia-ssr/
├── package.json               # Dependencies and scripts (build, dev, test)
├── tsconfig.json              # TypeScript compilation settings
├── public/                    # Static assets served directly to the browser
│   ├── client.js              # Bundled client hydration entrypoint
│   └── style.css              # Application styling
└── src/
    ├── html.d.ts              # Type declarations for imported HTML templates
    ├── server.ts              # Native Bun.serve HTTP server with SSR pipeline
    ├── client.ts              # Browser hydration entrypoint
    └── components/
        ├── app-root.ts        # Root custom element ViewModel
        └── app-root.html      # Root custom element template
```

---

## 5. End-to-End Reproduction & Execution Guide

### Prerequisites
- [Bun](https://bun.sh) (v1.2+) installed on your machine.

### Step 1: Install Dependencies
From the repository root:
```bash
bun install
```

### Step 2: Build the Core Packages
Ensure `@aureliajs/ssr` is built:
```bash
bun run --cwd packages/aurelia-ssr build
```

### Step 3: Run the Integration Tests
Execute the unit and integration test suite:
```bash
bun run --cwd examples/aurelia-ssr test
```

### Step 4: Build the Client Bundle
Bundle `src/client.ts` to `public/client.js`:
```bash
bun run --cwd examples/aurelia-ssr build
```

### Step 5: Start the Server
Start the native HTTP server:
```bash
bun run --cwd examples/aurelia-ssr start
```

Open `http://localhost:3005` in your browser. Inspect the page source to verify server-rendered HTML and the inert `<script id="__AURELIA_SSR_DATA__" type="application/json">` data block.

---

## 6. License

MIT © [Sandikodev](https://github.com/sandikodev)
