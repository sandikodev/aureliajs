# [MASTER RFC] Monorepo Native Purity & Ergonomic Community Conventions Initiative

## 🎯 Executive Summary & Context

As part of our commitment to **Convention over Configuration (CoC)**, architectural simplicity, and native platform ergonomics, this initiative audits and tracks candidate migrations across the `@aureliajs` monorepo.

Our goal is to **strip accidental complexity, eliminate redundant transitive dependencies, and adopt the cleanest possible native conventions** matching Bun, Vite, Hono, and Aurelia 2.

Every proposal below is isolated into its own GitHub Issue so the community can evaluate, discuss, debate, and verify trade-offs. If a migration ever causes unforeseen regressions, each issue contains an explicit rollback plan.

---

## 📋 Tracked RFC Issues

- [x] **[RFC 1: Migrate `@node-rs/argon2` to Native `Bun.password`](https://github.com/sandikodev/aureliajs/issues/1)** (`apps/api`) — Eliminates Rust N-API native bindings.
- [x] **[RFC 2: Eliminate React CSS Utilities (`cva`, `clsx`, `tailwind-merge`)](https://github.com/sandikodev/aureliajs/issues/2)** (`apps/web`) — Restores native Aurelia template class bindings.
- [ ] **[RFC 3: Migrate SSR DOM Emulation from `jsdom` to `linkedom` / `happy-dom`](https://github.com/sandikodev/aureliajs/issues/3)** (`packages/aurelia-ssr`) — 10.8x faster SSR throughput.
- [x] **[RFC 4: Eliminate Babel Dependencies from `aurelia-bridge`](https://github.com/sandikodev/aureliajs/issues/4)** (`packages/aurelia-bridge`) — Pure Vite/esbuild native transform.
- [ ] **[RFC 5: Consolidate Linter and Formatter (`oxlint` + `prettier`) into `biome`](https://github.com/sandikodev/aureliajs/issues/5)** (Root) — Unified Rust-based developer toolchain.
- [x] **[RFC 6: Purge Precompiled Binary VSIX from Git & Automate CI Release](https://github.com/sandikodev/aureliajs/issues/6)** (`packages/vscode-aux`) — Cuts 8.1MB binary bloat from git tree.

---

## 💡 Guiding Architectural Philosophy

1. **Platform-First & Native-First**: If the runtime (Bun) or platform (Web Standards / Aurelia 2) provides a feature out of the box, we do not install an external npm wrapper.
2. **Framework Identity**: Aurelia 2 is not React. We do not import React idioms (`clsx`, `cva`, `tailwind-merge`) into an application that already features first-class reactive two-way bindings.
3. **Zero Git Bloat**: Git is for source code, not precompiled binaries.
4. **Reversible & Documented**: Any breaking change or convention shift must have clear benchmarks and a documented regression path.

---

## 💬 Community Discussion & Feedback

We welcome feedback from developers, framework architects, and contributors! Please comment on individual issue threads or submit PRs linked to these RFCs.
