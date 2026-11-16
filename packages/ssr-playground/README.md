# `@aureliajs/ssr-playground`

Interactive Server-Side Rendering (SSR) & Client Hydration Inspector and Playground for **Aurelia 2 on Hono**, featuring dual **CLI / Terminal UI (TUI)** and **Web GUI** interfaces.

Modeled after the inspection capabilities of **SvelteKit Playground / REPL**, **Next.js RSC/SSR Inspector**, and **Qwik / Qwik City City Playground**, this tool provides end-to-end verification and performance diagnostics for Aurelia 2 components rendered server-side.

---

## Key Inspection Capabilities

1. **Server Rendering Breakdown**:
   - Component render time vs state whitelist serialization time.
   - Total server execution time (TTFB budget tracking).
   - Memory allocation delta during SSR.

2. **Network Transfer & Payload Sizing**:
   - Exact byte counts: Raw HTML vs Gzip wire size.
   - Hydration state byte counts vs Gzip wire size.
   - Document envelope compression savings percentage.
   - State-to-content overhead ratio.

3. **Hydration Marker & Security Whitelist Audit**:
   - Aurelia 2 marker pair integrity (`<!--au-start-->` and `<!--au-end-->`).
   - Strict whitelist DTO scanning to guarantee credentials, tokens, and private keys never leak to client `<script>` tags.
   - HTML script context character escaping (`\u003c`, `\u003e`, `\u0026`).

4. **Client Hydration & Reactivity Simulation**:
   - Emulates browser hydration in JSDOM using `hydrateFromServer`.
   - Asserts zero DOM node thrashing (`AUR0757` prevention).
   - Counts attached event listeners and verifies reactive state mutations.

5. **Estimated Core Web Vitals (Lighthouse Readiness)**:
   - Estimated First Contentful Paint (FCP).
   - Estimated Largest Contentful Paint (LCP).
   - Estimated Total Blocking Time (TBT).
   - Cumulative Layout Shift (CLS) risk assessment.
   - Overall grade (`A+`, `A`, `B`, `C`, `F`).

---

## Quickstart

### 1. Terminal UI (TUI) Mode

Inspect all built-in fixtures directly in the terminal:
```bash
bun run --cwd packages/ssr-playground inspect
```

Inspect a specific fixture:
```bash
bun run --cwd packages/ssr-playground inspect --fixture counter-card
bun run --cwd packages/ssr-playground inspect --fixture user-profile
bun run --cwd packages/ssr-playground inspect --fixture data-table
```

Output raw JSON for CI/CD test gates:
```bash
bun run --cwd packages/ssr-playground inspect --fixture data-table --json
```

### 2. Web GUI Mode

Launch the local interactive visual playground:
```bash
bun run --cwd packages/ssr-playground serve --port 4700
```

Open `http://localhost:4700` in your browser. The dashboard includes:
- **Left Panel**: Component fixture selector and editable JSON context/props.
- **Tab 1 — Live Preview**: Iframe rendering the full pre-rendered HTML with active client hydration.
- **Tab 2 — Server HTML & Markers**: Pre-rendered DOM tree and hydration marker integrity counter.
- **Tab 3 — State & Whitelist Security**: JSON tree viewer of `window.__HYDRATION__` with security audit status.
- **Tab 4 — Network & Waterfall**: Payload size visual breakdown, compression savings, and server timing.
- **Tab 5 — Core Web Vitals & Audit**: Estimated FCP, LCP, TBT, CLS rating, and engine findings.
