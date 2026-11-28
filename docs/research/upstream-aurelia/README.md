# Riset Upstream Aurelia 2 & Sintesis Inovasi SvelteKit

Direktori ini menyimpan hasil audit terstruktur untuk menyelaraskan ekosistem paket kita (`@aureliajs/*` dan `@hono/aurelia`) dengan inti framework **Aurelia 2** (`aurelia/aurelia`) sekaligus mengadopsi terobosan relevan dari **SvelteKit 3.0** secara selektif, berprinsip, dan etis.

---

## Daftar Dokumen (Urutan Baca yang Disarankan)

1. **[`01-aurelia-core-anatomy.md`](./01-aurelia-core-anatomy.md)** — *Anatomi Aurelia 2 Core & Akar Masalah SSR/Tooling*
   - Memetakan grafik paket inti & tooling di [`packages/aurelia`](file:///home/dev/project/aureliajs/packages/aurelia), status rilis (`v2.0.0-rc.2` + 50 commit di `master`), status SSR/hydration (`ISSRContext`, `Aurelia.hydrate()`, `#2494`, `#2527`–`#2538`), pipeline `.html` di `plugin-conventions`/`vite-plugin`, serta melacak akar masalah 6 *workaround* di `packages/aurelia-ssr/src/render.ts` dan menghasilkan 6 kandidat kontribusi upstream terurut.

2. **[`02-contribution-procedure.md`](./02-contribution-procedure.md)** — *Prosedur Kontribusi & Etika Upstream `aurelia/aurelia`*
   - Mendokumentasikan setup fork [`sandikodev/aurelia`](https://github.com/sandikodev/aurelia) sebagai submodule di [`packages/aurelia`](file:///home/dev/project/aureliajs/packages/aurelia) beserta guard monorepo lokal (`package.json`, `.oxlintignore`, `bunfig.toml`), tata kelola repositori (`CONTRIBUTING`, `LICENSE`, `AGENTS.md`, `commitlint`, Changesets, CLA), pipeline CI (`pr_lite` / `pr_full` / `pkg.pr.new`), lanskap PR/issue terkini, serta **Ethical Contribution Playbook** langkah demi langkah.

3. **[`03-sveltekit-dependency-analysis.md`](./03-sveltekit-dependency-analysis.md)** — *Analisis Dependensi & Arsitektur SvelteKit 3.0 pada `harijadi`*
   - Membedah stack produksi `@sveltejs/kit@^3.0.0` di `/home/dev/project/harijadi` serta kode internal `node_modules/@sveltejs/kit/src` (file-based routing, `hooks.server.ts`, `*.remote.ts`, `use:enhance`, `load`/`invalidate`, preloading/`snapshot`, `devalue`, `defineEnvVars`, `svelte-kit sync` `$types`, `vite-plugin-sveltekit-guard`, CSRF, `@sveltejs/adapter-vercel` + `@vercel/nft`), disertai audit 5 *pain points* build log dan *verdict* per fitur terhadap identitas Aurelia.

4. **[`04-synthesis-roadmap.md`](./04-synthesis-roadmap.md)** — *Sintesis Strategis & Roadmap Penyempurnaan*
   - Menggabungkan hasil `01`–`03` dengan inspeksi langsung `src/` seluruh 7 paket milik kita (`@aureliajs/ssr`, `@hono/aurelia`, `@aureliajs/vite-plugin-aux`, `@aureliajs/islands`, `@aureliajs/bridge`, `vscode-aux`, `ssr-playground`), memisahkan tegas usulan **upstream ke Aurelia** vs **fitur paket kita** vs **ide yang ditolak**, menyusun roadmap Short/Mid/Long Term, dan merangkum urutan kontribusi etis ke `aurelia/aurelia`.

5. **[`05-deep-audit-and-rfc-drafts.md`](./05-deep-audit-and-rfc-drafts.md)** — *Audit Teknis Mendalam, Analisis Regresi, & Draf RFC/Diskusi Otentik (Non-Slop)*
   - Membedah riwayat commit (*Chesterton's Fence* seperti Safari 16 `#1680`), branch PR aktif milik core maintainer (`#2560`, `#2574`, `#2559`, `#2565`, `#2479`), pengujian empiris `linkedom` vs `jsdom` (termasuk jebakan `Proxy` pada `el.style.getPropertyPriority` dan jejak `AUR0757` di `rendering.ts:132`), serta menyajikan 3 draf diskusi/issue/RFC berbahasa Inggris natural tanpa gaya penulisan *AI slop*.

6. **[`06-internal-packages-deep-audit-and-rfc.md`](./06-internal-packages-deep-audit-and-rfc.md)** — *Audit Teknis Mendalam & Spesifikasi RFC Internal untuk Paket Milik Kita*
   - Mengungkap 6 bug/jebakan tersembunyi pada kode paket kita saat ini (`maxAge = 30_000` yang merusak cache CDN/clock skew, urutan terbalik `ssrScope` di `hydrate.ts`, `AUR0016` pada `aurelia-islands/loader.ts`, kebocoran statis `node:fs` di root `@hono/aurelia`, bypass `serializeState` di `dataEndpoint`, serta kebutaan HMR `vite-plugin-aux` dan `vscode-aux` pada `<script setup>`), sekaligus menetapkan 5 spesifikasi RFC internal (`RFC-01` s/d `RFC-05`) sebelum tahap penulisan kode dimulai.

---

## Status Implementasi

Tahap 1 dan 2 dari roadmap di [`06-internal-packages-deep-audit-and-rfc.md`](./06-internal-packages-deep-audit-and-rfc.md) sudah di-commit dan di-push ke fork masing-masing. Enam perbaikan fondasi, RFC-01 sampai RFC-05, dan test-nya masuk dalam perubahan tersebut. Gate `build:packages`, `typecheck` (14/14), `lint`, dan `test` (294 pass, 1783 assertions) lolos.

Draf A dan B di [`05`](./05-deep-audit-and-rfc-drafts.md) sudah dipublikasikan ke `aurelia/aurelia`. Sesuai [`07`](./07-upstream-signal-map.md), tidak ada aksi upstream lanjutan: Draf C ditahan, `#2588` tidak diedit, dan tidak ada PR yang memakai audit ini sebagai pembenaran.

Satu kandidat bug kecil di luar batch audit maintainer, `#2586` tentang literal angka eksponen, sudah diperbaiki di branch `fix/exponent-number-literals` pada fork `sandikodev/aurelia` (`2f6df6ccd`) lengkap dengan test parser dan test render DOM. Branch sudah di-push, belum ada PR.

Commit peta sinyal `1797751` masih lokal di superproject.

---

## Ringkasan Keputusan Arsitektur

- **Prioritas Utama (Aurelia Core Alignment First)**: Hilangkan 4 dari 6 *workaround* SSR kita langsung di hulu melalui PR bugfix kecil, aman, dan berfokus tinggi (`TemplateElementFactory` per-document cache, `Array.from(el.attributes)` di `TemplateCompiler`, guard `adoptNode` & `getPropertyPriority`), diikuti kontribusi pada inisiatif aktif `#2536`/`#2538` dan diskusi RFC navigasi router (`invalidate`, preload, `snapshot`).
- **Diferensiasi Ekosistem Kita**: Pertahankan keunggulan yang tidak dimiliki SvelteKit (`@aureliajs/islands` untuk Zero-JS selective hydration, `@aureliajs/bridge` untuk polyglot interop & `au-htmx`, serta bundling Hono/Bun bebas `@vercel/nft` dan bebas overhead 15.958 `resolveId` guard).
- **Target Penyempurnaan Cepat di Paket Kita**: `au-enhance` + CSRF `Origin` guard dan pemisahan `./build` di `@hono/aurelia`; mode JSON `devalue.stringify`/`parse` + `ssrScope` di `@aureliajs/ssr`; lazy server-only import guard + dukungan `<script setup>`/`<script server>` di `@aureliajs/vite-plugin-aux` dan `vscode-aux`.
