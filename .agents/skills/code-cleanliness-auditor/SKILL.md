---
name: code-cleanliness-auditor
description: "Comprehensive architectural framework, cleanup procedures, and 100-point inspection taxonomy for codebases. Use when auditing, refactoring, eliminating workaround debts, removing bloated re-exports, stripping legacy backward-compatibility ballast, and enforcing pristine Convention-over-Configuration (CoC) and native language cleanliness."
---

# 🧹 Code Cleanliness & Architecture Auditor

> **Core Philosophy:** *A framework or codebase should be invisible.* It should honor the principle of least astonishment, enforce strict **Convention over Configuration (CoC)**, provide sharp knives without mechanical boilerplate, and eliminate leaky abstractions. If developers have to write glue code, mechanical path strings, or redundant wrappers to make standard things work, the framework architecture has failed.

---

## 🧭 The 100-Point Code Cleanliness Taxonomy

This taxonomy catalogs the 100 most common code smells, workaround debts, leaky abstractions, and legacy cruft encountered in modern fullstack and framework codebases, organized into 10 fundamental engineering pillars.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 10 PILLARS OF CODE PURITY                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Workaround Debts & Leaky Abstractions (Points 1–10)                 │
│ 2. Bloated Re-Exports, Barrel Files & Module Hazard (Points 11–20)     │
│ 3. Backward Compatibility Ballast & Legacy Cruft (Points 21–30)        │
│ 4. TypeScript Hygiene & Typing Anti-Patterns (Points 31–40)            │
│ 5. Dependency Injection & Object Lifecycle Hazards (Points 41–50)      │
│ 6. View, Component & Template Layer Clutter (Points 51–60)             │
│ 7. State Management & Data Flow Hazards (Points 61–70)                 │
│ 8. Build, Toolchain & Monorepo Configuration Sins (Points 71–80)       │
│ 9. Testing Suite Smells & Verification Hygiene (Points 81–90)          │
│ 10. Security, Operations & Defensive Coding Sins (Points 91–100)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Pillar 1: Workaround Debts & Leaky Abstractions

1. **Internal Bundler/Loader Path Leaks in Client Attributes**: Emitting file paths (`data-au-src="/islands/pricing.js"`) into public markup instead of inferring them automatically from the custom element tag name by convention.
2. **Ghost / Zombie Wrapping Elements**: Wrapping root components in arbitrary extra tags (e.g. `<app-root><profile-page>...</profile-page></app-root>`) instead of letting the designated component be the true, single root.
3. **Monkey-Patching Global Scope as Concurrency Shortcut**: Mutating `globalThis.window` or `globalThis.document` during HTTP requests instead of using per-request isolated container scopes (`new BrowserPlatform(dom.window)`).
4. **Ad-Hoc Regex HTML/JSON Parsers**: Using string `.replace()` or regular expressions to inject hydration scripts or rewrite HTML tags instead of structured AST nodes, DOM APIs, or templating functions.
5. **DOM Attribute Stringification of Complex Data**: Forcing large JSON payloads into inline HTML attributes (`data-props="{...}"`), leading to escaping vulnerabilities, attribute length limits, and DOM bloat.
6. **Hardcoded Port / Host Assumptions in Framework Code**: Embedding `http://localhost:3000` or fallback URLs in core library methods instead of deriving context from the incoming standard `Request` object.
7. **Thread/Event-Loop Blocking Sleep Timers**: Using `setTimeout(resolve, 50)` to "wait for DOM render" instead of observing genuine lifecycle microtasks, queue callbacks, or mutation observers.
8. **Catch-and-Swallow Silent Error Absorbers**: Wrapping critical initialization in `try { ... } catch { /* ignore */ }`, silently swallowing missing dependencies and turning fatal errors into mystery blank pages.
9. **Dual-Path Forking for Missing Features**: Creating duplicate parallel code paths (`renderLegacy()` vs `renderV2()`) instead of refactoring the root abstraction with clean default parameters.
10. **Client-Server State Leakage via Shared Singletons**: Storing per-request data in module-level `const requestCache = new Map()` causing cross-request data leaks and concurrency race conditions under traffic.

---

### Pillar 2: Bloated Re-Exports, Barrel Files & Module Hazard

11. **Omnibus Barrel Files (`index.ts` Dumping Everything)**: Re-exporting hundreds of private internal utilities from root index files, destroying bundler tree-shaking and inflating cold-start time.
12. **Circular Re-Export Loops**: `moduleA.ts` importing from `index.ts` while `index.ts` re-exports `moduleA.ts`, causing runtime `undefined` Temporal Dead Zone (TDZ) initialization crashes.
13. **Phantom Extension Tax (`.js` Imports in `.ts` Files)**: Writing `.js` extensions in TypeScript source files due to legacy NodeNext configuration habits instead of modern `"moduleResolution": "bundler"`.
14. **Dual Package Hazard (CJS/ESM Instance Duplication)**: Shipping both CJS and ESM builds without isolated state, resulting in two distinct copies of singletons (e.g. DI Container) running in memory.
15. **Wildcard `export *` Leaking Private Internal Types**: Exposing internal parser and helper types to library consumers, turning implementation details into accidental public API contracts.
16. **Re-Exporting Third-Party Dependencies Directly**: Re-exporting third-party packages (like `hono`, `jsdom`, or `lodash`) from your own package root, locking consumers into rigid transitive version pins.
17. **Dead Code Re-Exported for "Convenience"**: Keeping unused legacy functions in `index.ts` "just in case someone needs it", creating persistent dead-weight bundle creep.
18. **Namespace Pollution via Import Aliasing Overuse**: Doing `import * as Utils from './utils'` when only one function is consumed, preventing tree-shakers from eliminating dead symbols.
19. **Ambiguous Named Overrides in Re-Exports**: Re-exporting two files with overlapping symbol names (`export { config } from './a'; export { config } from './b'`), leading to compilation conflicts.
20. **Root Entrypoint Importing Server-Only in Client Entrypoint**: Having `src/index.ts` import Node.js built-ins (`node:fs`, `node:path`), breaking client bundlers even when the consumer only wanted types or client hydrators.

---

### Pillar 3: Backward Compatibility Ballast & Legacy Cruft

21. **Deprecated API Wrappers Maintained Past Major Versions**: Keeping v0.x shim wrappers indefinitely instead of issuing a clean breaking release with automated migration codemods.
22. **Polyfills for Modern Evergreen Browser Runtimes**: Shipping polyfills for `Promise`, `fetch`, `Object.assign`, or `Array.prototype.flat` when the minimum deployment target is ES2022+.
23. **Fallback Conditionals for Defunct Engines**: Code containing `if (typeof window !== 'undefined' && !window.customElements)` in a modern Web Components framework.
24. **Legacy Callback APIs Running Parallel to Async/Await**: Maintaining `(err, result) => void` callback overloads alongside standard Promise return signatures.
25. **Legacy Template String Comments (`<!--app-html-->`)**: Using comment string replacement instead of functional/component document shells.
26. **Redundant Parameter Overload Combinations**: 8 overloads for a function that could be cleanly expressed as `(target, options = {})`.
27. **Preserving Dead Feature Flags**: Leaving `if (FEATURE_V1_ENABLED)` conditionals after feature V1 has been deprecated and V2 is 100% stable.
28. **Zombie Config Keys Ignored by Modern Code**: Accepting config options in options interfaces that do nothing because the underlying engine was rewritten.
29. **Legacy Transpiler Helpers in Bundles**: Including `__awaiter`, `__generator`, `__spreadArray` helpers when compiling to modern ESNext targets.
30. **Shim Layers for Obsolete Third-Party Libraries**: Keeping adapters for dead libraries (e.g., Bower, SystemJS, RequireJS, Webpack 4).

---

### Pillar 4: TypeScript Hygiene & Typing Anti-Patterns

31. **Type Cast Escapism (`as any`, `as unknown as T`)**: Silencing TypeScript errors with brute-force type assertions instead of fixing the root interface or generic constraint.
32. **`Record<string, any>` as DTO Representation**: Using loose string-keyed objects instead of strict domain interfaces or Zod/TypeBox schemas.
33. **Missing `readonly` on Immutable Configuration & State**: Allowing accidental internal mutation of configuration objects or props.
34. **Non-Null Assertion Abuse (`object!.property!.method!()`)**: Bypassing strict null checks, causing production `Cannot read properties of null` runtime exceptions.
35. **Implicit `any` in Function Parameters and Catch Blocks**: Omitting types in catch clauses (`catch (err: any)`) instead of `catch (err: unknown)`.
36. **Overly Complex Type Gymnastics (Conditional Type Mazes)**: 50-line nested ternary types that slow down IDE typecheck by seconds and are unreadable by human maintainers.
37. **Types Duplicated Between Interface and Implementation**: Manually writing matching types in two separate files instead of deriving them via `typeof` or generic inference.
38. **Enum Bloat**: Using TypeScript `enum` (which generates runtime IIFE JavaScript) instead of union literals `type Trigger = 'visible' | 'idle' | 'interaction'`.
39. **Inconsistent Naming Between Type and Interface**: Mixing `IUserService`, `UserServiceType`, `TUser`, and `User` arbitrarily without convention.
40. **Dangling Declaration Files (`.d.ts`) Out of Sync with Source Code**: Hand-edited `.d.ts` files that drift from actual runtime behavior instead of generating declarations via `tsc`.

---

### Pillar 5: Dependency Injection & Object Lifecycle Hazards

41. **Service Locator Disguised as Dependency Injection**: Calling `container.get(MyService)` randomly inside functions instead of constructor / `@resolve` parameter injection.
42. **Global Mutable Singleton Registries**: Storing global registries outside of request-scoped DI containers, causing memory leaks and cross-request contamination.
43. **Static Method Abuse on Domain Classes (`static async loader()`)**: Using static methods that bypass instance-level dependency injection, making unit testing require global mocking.
44. **Circular Dependency Between High-Level and Low-Level Modules**: Engine importing from Adapter while Adapter imports from Engine.
45. **God Containers / Monolithic Service Classes**: A single `AppManager` or `SsrService` with 40 methods doing parsing, rendering, caching, network calls, and serialization.
46. **Hidden Constructor Side-Effects**: Constructors that make network calls, start background timers, or mutate DOM before `start()` or `attached()`.
47. **Unmanaged Event Listeners (Dangling Listeners)**: `addEventListener` without corresponding `removeEventListener` in `detaching()` / `dispose()`, causing memory leaks.
48. **Inversion of Inversion of Control**: Framework code forcing application code to register its internal pipeline hooks rather than consuming standard interfaces.
49. **Hardcoded Dependencies Inside Domain Logic**: Doing `new HttpClient()` or `new Database()` inside a component instead of injecting an interface.
50. **Ignoring Monotonic Epochs in Async Operations**: Race conditions when async operations finish after a component has already been unmounted, causing detached DOM mutations.

---

### Pillar 6: View, Component & Template Layer Clutter

51. **Direct DOM Manipulation in ViewModels**: Using `document.getElementById` or `element.querySelector` inside component logic instead of Aurelia's ref bindings and two-way properties.
52. **Logic Clutter in HTML Templates**: 20-character ternary expressions and nested calculations inside `${...}` instead of computed getters.
53. **Inline Styles as Quick Layout Fixes**: Hardcoding `style="margin-top: 15px; display: flex;"` in templates instead of design tokens or scoped styles.
54. **Over-Componentization (Micro-Components without Purpose)**: Creating separate components for single-line HTML tags with zero logic, inflating V8 IC (Inline Cache) allocations.
55. **Under-Componentization (Mega-Views)**: 1,500-line templates containing modals, tables, forms, and navigation in one monolithic file.
56. **Unscoped CSS Leaking Globally**: Global CSS class names (`.card`, `.btn`) without scoping (`data-scopeId` or BEM), causing stylesheet collisions.
57. **Unnecessary Wrapper Tags (`<div>` Soup)**: Adding layers of `<div>` simply to attach an attribute or binding instead of using `containerless` or direct element attributes.
58. **Prop Drilling Across Multiple Layers**: Passing props through 5 levels of components that don't need them instead of using DI or scoped context.
59. **Ignoring Built-in Aurelia Binding Behaviors**: Manually writing debounce/throttle timing logic in event handlers instead of `keyup.trigger="search() & debounce:300"`.
60. **Missing Key Binding in Dynamic Lists**: Rendering dynamic lists with `repeat.for` without providing identity tracking, degrading reconciliation efficiency.

---

### Pillar 7: State Management & Data Flow Hazards

61. **Duplicated Source of Truth (State Desynchronization)**: Keeping a local copy of a prop in component state without syncing on prop change.
62. **Hidden State Mutation (Impure Getters)**: Getters that mutate internal variables or trigger side effects during template evaluation.
63. **Unserialized Functions and Symbols in Server Payloads**: Passing closures or symbol-keyed properties into SSR state payloads, crashing JSON serialization.
64. **Regex-Based Secret Redaction Guesses**: Guessing secrets with regex `/(password|token|secret)/i` and accidentally stripping valid domain keys (e.g. `salt`, `txHash`).
65. **Stale Closure Traps in Event Handlers**: Event callbacks capturing stale variable references instead of reading current reactive properties.
66. **Unbounded Cache Growth Without Eviction (LRU/TTL)**: In-memory caches without maximum size or expiration, inevitably triggering Out-Of-Memory (OOM) under prolonged load.
67. **Premature Persistent Storage (Spamming localStorage/sessionStorage)**: Storing non-persistent UI state in browser storage causing stale state across sessions.
68. **Deep Object Cloning in Render Loops**: Running `JSON.parse(JSON.stringify(obj))` or `structuredClone` on every render frame or binding tick.
69. **Lack of Idempotency in State Transitions**: State mutation functions that fail or duplicate items if invoked twice in rapid succession.
70. **Zombie Subscriptions in Reactive Streams**: Subscribing to Observables or Signals without unsubscribing in teardown lifecycles.

---

### Pillar 8: Build, Toolchain & Monorepo Configuration Sins

71. **Mismatched TypeScript Configurations across Monorepo Workspaces**: One package using `NodeNext`, another using `bundler`, another using `node`, causing cross-package resolution failures.
72. **Unpinned or Inconsistent Peer Dependency Versions**: Monorepo submodules depending on conflicting versions of `aurelia` (e.g., `^2.0.0-rc.2` vs `^2.0.0-beta.9`).
73. **Unused Dependencies in `package.json`**: Forgotten test libraries, obsolete CSS frameworks, or legacy plugins lingering in dependencies.
74. **`devDependencies` Leaking into `dependencies`**: Production `dependencies` containing `@types/node`, `@types/bun`, or build tools, bloating production installs.
75. **Missing or Broken `exports` Field in `package.json`**: Publishing packages with only `main` and without subpath export maps (`./client`, `./server`), breaking modern bundlers.
76. **Including Test and Build Artifacts in Published Packages**: Omitting the `"files": ["dist"]` filter, publishing `test/`, `src/`, `.github/`, and scratch files to npm.
77. **Slow / Redundant Build Steps in CI Pipelines**: Rebuilding packages sequentially instead of using task pipelines with artifact caching.
78. **Hardcoded System Absolute Paths in Scripts**: Scripts containing `/home/dev/...` or `C:\Users\...` that break on any other machine or CI container.
79. **Dirty Git Status after Build Execution**: Build scripts that modify tracked source files during compilation, creating constant git diff noise.
80. **Inconsistent Line Endings & Formatting Clutter**: Files mixing CRLF and LF or conflicting indentations (2 vs 4 spaces) due to missing `.editorconfig`.

---

### Pillar 9: Testing Suite Smells & Verification Hygiene

81. **Testing Implementation Details Instead of Contracts/Behaviors**: Tests that assert internal private property names instead of public DOM/API output.
82. **Mocking Everything (Mockist Fatigue)**: Mocking 10 layers of dependencies so the test passes while the real integration is broken.
83. **Flaky Timing-Dependent Tests (`sleep(500)`)**: Tests that rely on arbitrary sleep durations instead of awaiting real lifecycle promises or DOM events.
84. **Cross-Test State Pollution**: Tests sharing a global container, DOM document, or database without resetting between test cases.
85. **Empty / No-op Assertion Tests**: Tests that execute code but have zero `expect()` assertions, passing even when the feature fails.
86. **Copy-Pasted Test Boilerplate**: 50 lines of setup duplicated in 20 test files instead of reusable test fixtures and helper factories.
87. **Testing External Third-Party Libraries**: Writing unit tests to verify that `hono` routes work or `Array.prototype.map` works instead of testing your own domain logic.
88. **Ignored or Commented-Out Failing Tests (`xit`, `test.skip` forever)**: Skipping broken tests for months instead of fixing or intentionally deprecating them.
89. **Slow Test Suites Due to Heavy JSDOM Spawning**: Creating fresh JSDOM instances for trivial pure-math unit tests that don't touch the DOM.
90. **Missing Negative / Edge Case Tests**: Only testing the happy path and ignoring timeouts, 404s, malformed inputs, and circular references.

---

### Pillar 10: Security, Operations & Defensive Coding Sins

91. **Raw `innerHTML` String Interpolation without Sanitization**: Injecting untrusted user strings into `innerHTML` instead of using text bindings or DOM text nodes.
92. **Exposing Internal Exception Stack Traces in Production**: Sending raw database errors or file paths to client HTTP responses instead of generic error codes.
93. **Unsafe Hydration State Injection via Executable Scripts**: Injecting `window.__DATA__ = ${JSON.stringify(data)}` allowing script breakout `</script><script>alert(1)`.
94. **Missing Content Security Policy (CSP) Compatibility**: Relying on `unsafe-inline` or `unsafe-eval` instead of nonce-based or hash-based scripts.
95. **Unvalidated HTTP Input Payloads**: Passing `c.req.json()` directly to domain services without schema validation (Zod, TypeBox, Valibot).
96. **Missing Rate Limiting and Payload Size Limits**: Endpoints accepting unbounded JSON payloads, allowing trivial Denial-of-Service (DoS) attacks.
97. **Insecure Cookie Configurations**: Setting session cookies without `HttpOnly`, `Secure`, and `SameSite=Lax/Strict`.
98. **Hardcoded Secrets or API Keys in Source Code**: Committing private keys, webhook secrets, or service passwords into git repositories.
99. **Silent Failure on Network Timeouts**: Network fetch calls without `AbortController` timeouts, causing connections to hang indefinitely when remotes stall.
100. **Absence of Observability and Structured Logging**: Using `console.log("here")` instead of structured JSON logs with correlation IDs (`requestId`, `tenantId`).

---

## 🛠️ Step-by-Step Codebase Sanitation Procedure

When auditing a repository or preparing for a clean release:

1. **Phase 1: Module & Boundary Audit**
   - Check all `tsconfig.json` files for consistent `"moduleResolution": "bundler"`.
   - Run grep for `.js` specifiers in `.ts` files: `grep -rn "from ['\"][^'\"]*\.js['\"]" src/`.
   - Ensure all public packages have explicit `"exports"` subpaths with typed declarations.

2. **Phase 2: Leaky Abstraction Purge**
   - Verify that rendered HTML contains zero internal bundler paths (`data-au-src`) or redundant tag metadata.
   - Audit root SSR documents to eliminate double-wrapping (`<app-root><my-component>`).

3. **Phase 3: Lifecycle & DI Alignment**
   - Replace static pseudo-loaders with native dependency-injected lifecycle hooks (`resolveRequestContext()`).
   - Audit all `addEventListener` and observer subscriptions for symmetric disposal.

4. **Phase 4: Full Suite Verification**
   - Run complete unit, integration, and high-concurrency stress test suites.
   - Verify build outputs have zero undeclared external dependencies or dirty git states.
