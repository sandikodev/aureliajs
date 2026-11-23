# [MASTER RFC] Monorepo Native Purity & Ergonomic Community Conventions Initiative

## 🎯 Executive Summary & Context

As part of our commitment to **Convention over Configuration (CoC)**, architectural simplicity, and native platform ergonomics, this initiative audits and tracks candidate migrations across the `@aureliajs` monorepo. 

Our goal is to **strip accidental complexity, eliminate redundant transitive dependencies, and adopt the cleanest possible native conventions** matching Bun, Vite, Hono, and Aurelia 2. 

Every proposal below is isolated into its own RFC issue so the community can evaluate, discuss, debate, and verify trade-offs. If a migration ever causes unforeseen regressions, each issue contains an explicit rollback plan.

---

## 📋 Tracked RFC Issues

| Issue | Area | Proposal | Type | Status |
|---|---|---|---|---|
| [#1](./01-rfc-migrate-argon2-to-bun-password.md) | `apps/api` | Migrate `@node-rs/argon2` $\rightarrow$ Native `Bun.password` | `native` / `shrink` | 📝 Open for Discussion |
| [#2](./02-rfc-eliminate-react-css-utilities-in-web.md) | `apps/web` | Eliminate `cva`, `clsx`, `tailwind-merge` $\rightarrow$ Aurelia Native Bindings | `native` / `yagni` | 📝 Open for Discussion |
| [#3](./03-rfc-migrate-ssr-dom-from-jsdom-to-linkedom.md) | `packages/aurelia-ssr` | Migrate default DOM emulation from `jsdom` $\rightarrow$ `linkedom` | `native` / `shrink` | 📝 Open for Discussion |
| [#4](./04-rfc-eliminate-babel-from-vite-bridge.md) | `packages/aurelia-bridge` | Eliminate `@babel/core` $\rightarrow$ Vite Native / Esbuild | `native` / `delete` | 📝 Open for Discussion |
| [#5](./05-rfc-consolidate-lint-format-to-biome.md) | Monorepo Root | Consolidate `oxlint` + `prettier` $\rightarrow$ `biome` (Rust Toolchain) | `tooling` | 📝 Open for Discussion |
| [#6](./06-rfc-purge-binary-vsix-from-git.md) | `packages/vscode-aux` | Purge 8.1MB binary `.vsix` from git $\rightarrow$ CI/CD Release Artifact | `git-hygiene` | 📝 Open for Discussion |

---

## 💡 Guiding Architectural Philosophy

1. **Platform-First & Native-First**: If the runtime (Bun) or platform (Web Standards / Aurelia 2) provides a feature out of the box, we do not install an external npm wrapper.
2. **Framework Identity**: Aurelia 2 is not React. We do not import React idioms (`clsx`, `cva`, `tailwind-merge`) into an application that already features first-class reactive two-way bindings.
3. **Zero Git Bloat**: Git is for source code, not precompiled binaries.
4. **Reversible & Documented**: Any breaking change or convention shift must have clear benchmarks and a documented regression path.

---

## 💬 Community Discussion & Feedback

We welcome feedback from developers, framework architects, and contributors! Please comment on individual issue threads or submit PRs linked to these RFCs.
