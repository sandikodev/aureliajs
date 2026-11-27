# 04 — Sintesis Strategis & Roadmap Penyempurnaan: Aurelia Core + Ekosistem Kita vs SvelteKit

Dokumen ini menyintesiskan seluruh temuan dari analisis inti Aurelia 2 ([`01-aurelia-core-anatomy.md`](./01-aurelia-core-anatomy.md)), prosedur kontribusi etis upstream ([`02-contribution-procedure.md`](./02-contribution-procedure.md)), serta bedah dependensi & arsitektur SvelteKit 3.0 ([`03-sveltekit-dependency-analysis.md`](./03-sveltekit-dependency-analysis.md)), lalu memetakannya langsung ke kode sumber aktif di seluruh paket milik kita (`packages/*`).

Prinsip penuntun utama dokumen ini adalah **Aurelia Core Alignment First**: setiap inovasi SvelteKit disaring terlebih dahulu apakah ia merupakan masalah fundamental platform/DOM/router yang layak disumbangkan ke `aurelia/aurelia` agar seluruh komunitas Aurelia mendapat manfaat, atau fitur *meta-framework* / ergonomi fullstack yang paling sehat hidup di paket `@aureliajs/*` dan `@hono/aurelia`, atau justru *paradigm mismatch* yang harus ditolak demi menjaga identitas **Dependency Injection**, **Convention-over-Configuration (CoC)**, **Direct-DOM**, **Web Standards**, dan **Hono-first**.

---

## 1. Pemetaan Kapabilitas, Inovasi Relevan, & Gap per Paket Kita

### 1.1 `@aureliajs/ssr` (`packages/aurelia-ssr/src/`)
- **Kapabilitas Saat Ini**:
  - Engine SSR murni yang *framework-agnostic* dan *request-scoped* menggunakan `BrowserPlatform(scope.win)` per permintaan (`packages/aurelia-ssr/src/render.ts:292-313`), mendukung `linkedom` secara default dan `jsdom` via `detectDefaultSSREngine()` (`render.ts:34-43`).
  - Mengatasi 6 hambatan core Aurelia `2.0.0-rc.2` melalui *local workaround*: `SsrTemplateElementFactory` untuk `AUR0757` (`render.ts:174-218`), `app.container.get` + `Object.assign` untuk `AUR0016` (`render.ts:319-326`), `Proxy` *live* `Element.prototype.attributes` (`render.ts:71-114`), polyfill `adoptNode` (`render.ts:58-65`), polyfill `getPropertyPriority` (`render.ts:116-120`), dan `settle` timeout (`render.ts:335-337`).
  - Serialisasi aman-XSS ke `<script type="application/json" id="__AURELIA_SSR_DATA__">` (`serialize.ts:15-133`, `html.ts:17`), `renderDocument()` 1-baris (`document.ts:61-118`), dan `./client` hydrator (`hydrate.ts:182-265`) dengan token `IRequestContext` (`tokens.ts:19-32`).
- **Inovasi SvelteKit & Temuan Core yang Relevan**:
  - **Core Upstream (`01`)**: Perbaikan `master` pasca-`rc.2` untuk text node round-trip (`prepareSSRForSerialization` / `restoreSSRTextNodes` dari PR `#2563`) dan `hydrate()` melalui `start()` (PR `#2561`), serta open issues `#2494` (cache template lintas dokumen), `#2534` (`IPendingTasks` / `whenStable`), `#2538` (`discardDom` + perekaman `ISSRScope` manifest saat render), dan `#2533` (mismatch fallback).
  - **SvelteKit (`03`)**: Serialisasi `devalue.stringify`/`parse` (JSON mode) untuk mempertahankan `Date`, `Map`, `Set`, `BigInt`, `RegExp`, `undefined`, dan siklus; serta *deferred promise streaming* di `render.js`.
- **Gap Saat Ini**:
  1. `serialize.ts:50-102` masih mengubah `Date` dan `bigint` menjadi string biasa, dan `Map`/`Set` menjadi `{}` kosong karena iterasi `Object.entries(data)`.
  2. `renderAurelia` (`render.ts`) belum memancarkan `ssrScope` ke `HydrationPayload`, sehingga `createClientHydrator` (`hydrate.ts:236-258`) di produksi jatuh ke jalur destruktif `host.replaceChildren()` alih-alih adopsi DOM non-destruktif `app.hydrate()`.
  3. Menunggu async data masih memakai `settle` berbasis `setTimeout` (`render.ts:335-337`) bukan `whenStable()` / `IPendingTasks` (`#2534`), dan masih membawa 4 polyfill LinkeDOM yang seharusnya bisa dibereskan langsung di hulu Aurelia.

### 1.2 `@hono/aurelia` (`packages/hono-aurelia/src/`)
- **Kapabilitas Saat Ini**:
  - Adapter tipis Hono dengan router-scoped `aureliaDefaults` / `aureliaRenderer` berbasis `WeakMap<Request, ...>` (`packages/hono-aurelia/src/adapter.ts:38-95`).
  - `aurelia()` (`adapter.ts:146-360`) menjalankan `loader` co-located, resolusi `title` dan `status`, content negotiation (`Accept: application/json` via `dataEndpoint` di `adapter.ts:259-270`), serta True Web Streams SSR yang mem-flush `shell.preamble` lebih awal (`adapter.ts:286-332`).
  - `aureliaAction()` (`adapter.ts:384-421`) menangani mutasi form/action via `_action` atau `X-Action`.
  - `./client` (`client.ts:8-25`) mengekspor ulang primitif client `@aureliajs/ssr/client`; `./build` (`builder.ts:82-232`) menyediakan `createVirtualClientPlugin`, `stubJsdomPlugin`, `buildClient`, dan `buildWorker`.
- **Inovasi SvelteKit yang Relevan**:
  - Progressive form enhancement `use:enhance` dengan hook `cancel()` (termasuk skenario offline outbox di `harijadi`), CSRF `Origin` validation default pada mutasi non-GET (`csrf.js`), JSON data endpoint client fetcher + `invalidate`/`invalidateAll`, `defineEnvVars` (yang kompatibel dengan `c.env` Hono), `data-sveltekit-preload-data="hover"`, serta SSE `AsyncGenerator` (`query.live`).
- **Gap Saat Ini**:
  1. **Belum ada client runtime interaktif**: `@hono/aurelia/client` (`client.ts`) baru mem-bootstrap satu halaman awal; belum ada Custom Attribute `au-enhance` untuk `<form method="POST">` maupun interceptor link soft-navigation (`data-au-preload`, fetcher ke `dataEndpoint`).
  2. **Keamanan & Isolasi**: `aureliaAction()` (`adapter.ts:384-421`) belum menyertakan pengecekan `Origin` / `Sec-Fetch-Site` default terhadap serangan CSRF form POST. Selain itu, `index.ts:14-22` dan `server.ts:12-20` mengekspor `builder.ts` yang mengimpor `node:fs`, `node:path`, dan `bun` — berisiko menarik dependensi Node ke entry runtime Edge murni bila tidak dipisahkan tegas ke subpath `./build`.
  3. **Layout & Route Groups**: Belum ada helper komposisi layout bertingkat (`aureliaLayout` / pewarisan loader induk→anak) di atas Hono.

### 1.3 `@aureliajs/vite-plugin-aux` (`packages/vite-plugin-aux/src/`)
- **Kapabilitas Saat Ini**:
  - Parser block `.aux` dengan *depth tracking* untuk nested `<template>` (`packages/vite-plugin-aux/src/parser.ts:36-176`), compiler menjadi `CustomElement.define(...)` (`compiler.ts:255-519`), scoped CSS hash `au-xxxx` (`scope.ts`), dan ekstraktor metadata Aurelia (`<import>`, `<bindable>`, `<containerless>`, `<use-shadow-dom>`, `<alias>`, `<capture>`).
  - `<script setup>` transformer (`setup.ts:68-448`) yang menginfer `@bindable` dari top-level `let` dan menulis ulang referensi field menjadi `this.<field>`.
  - Execution boundaries: `<script server>` dihilangkan saat `!options.isServer` (`compiler.ts:494-511`), plus penanda statis `clientOnly`, `serverOnly`, dan `island` (`compiler.ts:483-491`).
  - Mendukung Vite 8 (`@swc/wasm` + `transformWithOxc` di `index.ts:117-274`), Bun (`bun.ts:31-60`), dan esbuild (`esbuild.ts:36-72`).
- **Inovasi SvelteKit & Temuan Core yang Relevan**:
  - **Aurelia Core (`01`)**: `transformTemplateAssetUrls` berbasis `parse5` (`@aurelia/vite-plugin`) untuk me-rewrite `img[src]`/`link[href]` di HTML menjadi asset import Vite, serta `devPlugin` untuk `/development` mode diagnostics.
  - **SvelteKit (`03`)**: Server-only import guard (`guard.js`) — namun dilakukan **secara lazy/targeted** tanpa beban `15.958` panggilan `resolveId` — dan jembatan tipe server→client (`.d.ts` virtual untuk `.aux` SFC).
- **Gap Saat Ini**:
  1. `auxPlugin` (`index.ts:161,185`) belum mendeteksi otomatis mode SSR Vite (`options?.ssr` pada hook `transform(code, id, opts)` atau `this.environment?.config?.consumer === 'server'`), sehingga pemisahan `<script server>` pada dual-environment Vite build masih bergantung pada opsi manual.
  2. `<template server-only>` baru memberi flag `.serverOnly = true` (`compiler.ts:486-488`), belum mengeliminasi JS runtime komponen tersebut pada bundle client.
  3. `handleHotUpdate` (`index.ts:250-253`) hanya membandingkan `descriptor.script` dan `descriptor.template`, belum memeriksa perubahan pada `setupScript` maupun `serverScript`.
  4. Belum memiliki *lazy server-only import guard*, belum melakukan asset URL rewriting pada `<template>`, dan transformasi `<script setup>` (`setup.ts`) masih berbasis regex/line-scanner (belum AST TypeScript seperti `@aurelia/plugin-conventions`).

### 1.4 `@aureliajs/islands` (`packages/aurelia-islands/src/`)
- **Kapabilitas Saat Ini**:
  - Arsitektur ortogonal "WHEN": `IslandTemplateController` (`packages/aurelia-islands/src/island-controller.ts:31-128`) memakai Synthetic Views Aurelia (`IViewFactory` + `IRenderLocation`) untuk menunda instansiasi komponen dengan trigger `load`, `idle`, `visible`, `media`, dan `interaction` (`scheduler.ts:11-157`).
  - Mode Zero-JS SSR: `renderIslandShell()` & `renderIsland()` (`server.ts:121-283`) + micro-loader `observeIslands()` tanpa runtime Aurelia di awal (`loader.ts:1-238`).
- **Inovasi SvelteKit & Temuan Core yang Relevan**:
  - **Aurelia Core (`01`)**: Sejalan langsung dengan RFC upstream `#2537` (*Incremental hydration and pre-hydration event replay*) dan PR `#2560` (`defer` template controller).
  - **SvelteKit (`03`)**: Tidak dimiliki oleh SvelteKit (SvelteKit hanya menyediakan `csr = false` biner). Ini adalah diferensiator kompetitif utama kita; namun kita bisa mengadopsi pola **link/module preloading (`hover`/`tap`)** dan **event replay** selama island sedang diunduh.
- **Gap Saat Ini**:
  1. Ketika trigger `interaction` (`click`, `focusin`) memicu lazy import modul island (`loader.ts:60-62,145-238`), event awal user belum di-*replay* setelah komponen selesai hydrate.
  2. `loader.ts:107-136` menduplikasi setup manual `DI.createContainer()` + `BrowserPlatform` + `templateFactory` untuk lingkungan tanpa `globalThis.HTMLElement` dan menghapus konten SSR via `ctx.element.innerHTML = ''` (`line 104`) alih-alih `app.hydrate()` non-destruktif.

### 1.5 `@aureliajs/bridge` (`packages/aurelia-bridge/src/`)
- **Kapabilitas Saat Ini**:
  - Arsitektur ortogonal "WHAT": `<au-bridge>` dan elemen khusus (`<au-react>`, `<au-vue>`, `<au-svelte>`, `<au-solid>`, `<au-preact>`, `<au-qwik>`, `<au-lit>`) dengan two-way `value.bind`, auto-detection (`detectFramework` di `au-bridge.ts:36-80`), guard SSR `optional(ISSRContext)` (`au-bridge.ts:139`), dan `mountEpoch` anti-race-condition.
  - Dual-pillar Hypermedia: `AuHtmx` & `AuHtmxElement` (`au-htmx.ts:45-182`) yang otomatis memanggil `new Aurelia(this.container).enhance({ host: target, component: {} })` saat `htmx:afterSwap`.
  - Vite plugin polyglot (`vite/index.ts:89-215`) untuk `.vue`, `.svelte`, Solid JSX, dan optimasi pre-bundling.
- **Inovasi SvelteKit & Temuan Core yang Relevan**:
  - **Aurelia Core (`01`)**: Issue upstream `#2530` (*Hydration treats every hyphenated tag as an Aurelia component boundary, breaking web components*) berdampak langsung bila `<au-lit>` atau custom element asing berada di halaman yang di-hydrate.
  - **SvelteKit (`03`)**: Tidak ada padanan di SvelteKit. Pola `au-htmx` + `Aurelia.enhance()` bahkan memberi jalur adopsi bertahap bagi aplikasi server-rendered.
- **Gap Saat Ini**:
  1. Pada mode SSR, `<au-bridge>` (`au-bridge.ts:139`) baru menghentikan mount di server (*client-only placeholder*); belum mendukung opsional SSR delegasi untuk adapter yang memiliki SSR renderer (mis. React `renderToString` / Svelte `render`) bila diperlukan.
  2. Perlu memastikan integrasi `app.hydrate()` di masa depan tidak menganggap custom element pihak ketiga (`<au-lit>`) sebagai Aurelia component boundary (`#2530`).

### 1.6 `vscode-aux` (`packages/vscode-aux/src/`)
- **Kapabilitas Saat Ini**:
  - Language extension untuk `.aux`: TextMate grammar, snippets, hover (`hover.ts`), completion (`completion.ts`), definition (`definition.ts`), dan semantic template linter (`linter.ts`) berbasis TypeScript AST (`analyzer.ts:16-241`).
- **Inovasi SvelteKit yang Relevan**:
  - Pengalaman IDE sekelas `svelte-check` (`svelte-kit sync` + typechecking ekspresi template terhadap tipe loader server & props).
- **Gap Saat Ini**:
  1. `parser.ts:65-82` hanya mem-parsing satu tag `<script>` tunggal dan **belum mengenali** `<script setup>` maupun `<script server>`, sehingga `analyzer.ts:19` tidak dapat memvalidasi binding template terhadap variabel `let` di `<script setup>` atau hasil `loader()` di `<script server>`!
  2. Belum ada CLI checker (`aux-check`, padanan `svelte-check`) untuk CI/CD pipeline.

### 1.7 `ssr-playground` (`packages/ssr-playground/src/`)
- **Kapabilitas Saat Ini**:
  - Inspector & CLI diagnostic engine (`inspector.ts:18-145`, `compiler.ts:1-709`, `audit.ts`, `network.ts`, `client-simulator.ts`) dengan 16 contoh skenario, audit keamanan context (`auditContextSecurity`), dan metric TTFB/FCP/LCP.
- **Inovasi SvelteKit yang Relevan**:
  - Simulasi visual dan verifikasi regresi untuk fitur fullstack: JSON payload `devalue`, non-destructive `hydrate()` round-trip, form `au-enhance`, dan streaming deferred chunks.
- **Gap Saat Ini**:
  1. `inspector.ts:43` masih menyetel `preserveMarkers: false`, sehingga belum memverifikasi integritas marker `<!--au-->` / `<!--au-t-->` dan proses adopsi `app.hydrate()` secara end-to-end.
  2. Belum mencakup audit *server-only leak* pada hasil kompilasi client `.aux` maupun benchmark overhead bundle vs SvelteKit.

---

## 2. Pembagian Tegas: Upstream ke `aurelia/aurelia` vs Paket Kita vs Ditolak

Sesuai prinsip **Aurelia Core Alignment First**, setiap temuan dari `01` dan `03` dibagi ke dalam tiga kategori tegas berikut.

### 2.1 Usulan Upstream ke `aurelia/aurelia` (*Offer Boldly Upstream*)

Kriteria: menyentuh primitif DOM/DI/Compiler/Runtime/Router yang berlaku universal untuk semua pengguna Aurelia 2, bebas dari opini HTTP framework (Hono) maupun format SFC (`.aux`).

1. **[Bug Fix Prioritas 1] Isolasi Cache `TemplateElementFactory` per `Document` (Perbaiki `#2494` / `AUR0757`)**
   - **Lokasi Core**: `packages/template-compiler/src/template-element-factory.ts:16,28-51`.
   - **Alasan & Keselarasan**: `markupCache` level-modul membocorkan node milik `Document` lama ke request SSR berikutnya (`AUR0757`). Memindahkannya ke `WeakMap<Document, Map<string, HTMLTemplateElement>>` atau instance factory per `IPlatform` 100% selaras dengan DI scoping dan Web Standards.
2. **[Bug Fix Prioritas 2] Hilangkan Ketergantungan Live `NamedNodeMap` di `TemplateCompiler._classifyAttributes`**
   - **Lokasi Core**: `packages/template-compiler/src/template-compiler.ts:743-779` (serta `_compileSurrogate` di `:337-349`).
   - **Alasan & Keselarasan**: Mengganti loop `--i; --ii;` yang mengandalkan mutasi *live* `el.attributes` dengan snapshot `Array.from(el.attributes)` membuat compiler Direct-DOM Aurelia kompatibel langsung dengan DOM engine ringan Edge/Workers (`linkedom`) tanpa *Proxy hack*.
3. **[Bug Fix Prioritas 3] Fallback Aman `adoptNode` dan `getPropertyPriority`**
   - **Lokasi Core**: `packages/template-compiler/src/template-compiler.ts:1592`, `packages/runtime-html/src/templating/rendering.ts:160`, `packages/runtime-html/src/resources/custom-attributes/show.ts:68`.
   - **Alasan & Keselarasan**: Penambahan guard optional chaining (`doc.adoptNode?.(...) ?? doc.importNode?.(..., true)` dan `style.getPropertyPriority?.('display') ?? ''`) berisiko nyaris nol dan mendukung *graceful degradation* standar Web.
4. **[Small Feature Prioritas 4] Opsi `props` / `configure` pada `IAppRootConfig` & `Aurelia.forHost(host)`**
   - **Lokasi Core**: `packages/runtime-html/src/app-root.ts:17-42,113-141,199-211`; `packages/aurelia/src/index.ts:6-20`; `packages/kernel/src/di.container.ts:624-673,721-724`.
   - **Alasan & Keselarasan**: Menghilangkan jebakan `AUR0016` (`resolve()` saat pre-instantiation) dan ketergantungan global `PLATFORM` di entry `aurelia`, menjaga ergonomi DI + class field initializer tetap murni.
5. **[Medium Feature / Kontribusi Issue Aktif] Router SSR/SSG (`#2536`) & `ISSRContext` Server Cost (`#2538`)**
   - **Lokasi Core**: `packages/router/src/location-manager.ts:199-220`; `packages/runtime-html/src/templating/ssr.ts:98-104`; `packages/runtime-html/src/dom.ts`.
   - **Alasan & Keselarasan**: Membawa pengalaman `harijadi`/SvelteKit yang memang dibutuhkan Aurelia core: status/redirect HTTP dari `ServerLocationManager` + `discoverRoutes()` (`#2536`) dan `discardDom` flag untuk melewatkan teardown DOM di SSR (`#2538`).
6. **[RFC / Diskusi Terarah] Inovasi Navigasi SvelteKit untuk `@aurelia/router` (Reload/Invalidate, Preload, & History Snapshot) + Incremental Hydration (`#2537`, `#2533`, `#2534`)**
   - **Lokasi Core**: `packages/router/src/router.ts`, `route-context.ts`, `viewport.ts`; `packages/runtime-html/src/aurelia.ts`.
   - **Alasan & Keselarasan**: Memberikan mekanisme deklaratif untuk me-rerun `loading()` pada rute aktif (`router.invalidate()`), *link preloading* (`hover`/`tap`), dan *history state snapshot* (padanan `snapshot` SvelteKit) menggunakan Web `History API`/`sessionStorage` + lifecycle hooks Aurelia tanpa memaksa file-system routing. Sedangkan `#2537` (*incremental hydration & event replay*) dan `#2534` (`whenStable`) selaras langsung dengan riset kita di `@aureliajs/islands` dan `@aureliajs/ssr`.

### 2.2 Fitur yang Dibangun di Paket Kita (*Build in Our Packages*)

Kriteria: inovasi berorientasi DX fullstack, Hono/Edge integration, `.aux` SFC ergonomics, dan island/polyglot composability yang tidak boleh mempergemuk core Aurelia.

| Fitur / Inovasi | Paket Target | Justifikasi Identitas Aurelia & Nilai Tambah |
| :--- | :--- | :--- |
| **Custom Attribute `au-enhance` (+ `cancel()` hook untuk offline/optimistic UI)** | `@hono/aurelia/client` | 100% Web Standards (`<form>`, `FormData`, `fetch`) & Custom Attribute Aurelia murni; berpasangan langsung dengan `aureliaAction()`. |
| **CSRF `Origin` / `Sec-Fetch-Site` Guard Default pada `aureliaAction()`** | `@hono/aurelia` | Melindungi mutasi form POST berbasis standar Web Request headers tanpa magic tersembunyi. |
| **Client Navigator & Data Revalidator (`data-au-preload`, soft-nav, `invalidate`)** | `@hono/aurelia/client` | Memanfaatkan fitur `dataEndpoint` (`Accept: application/json`) yang sudah ada di `adapter.ts` untuk SPA-like navigation & prefetching. |
| **Cascading Layout Wrapper (`aureliaLayout`) & Hono Env Helper (`defineEnv`)** | `@hono/aurelia` | Komposisi Hono eksplisit yang ramah `c.env` Cloudflare Workers/Bun tanpa mengunci struktur folder wajib. |
| **SSE `AsyncGenerator` Live Helper (`aureliaStream()`)** | `@hono/aurelia` | Alternatif murni Web Streams (`text/event-stream`) untuk fitur `query.live` SvelteKit, berpadu dengan Hono RPC `hc`. |
| **Mode JSON `devalue.stringify`/`parse` + Deferred Promise Streaming** | `@aureliajs/ssr` & `@hono/aurelia` | Menjaga prinsip strict-CSP inert `<script type="application/json">` (`html.ts`) sekaligus mendukung `Date`/`Map`/`Set`/`BigInt`/circular/streaming. |
| **Adopsi `ssrScope` + `prepareSSRForSerialization` / `restoreSSRTextNodes` (v2.0.0-rc.3+)** | `@aureliajs/ssr` | Mengaktifkan true non-destructive `app.hydrate()` di browser sehingga fokus input dan DOM terjaga tanpa `host.replaceChildren()`. |
| **Lazy Server-Only Import Guard & Auto Env SSR Detection (`isServer`)** | `@aureliajs/vite-plugin-aux` | Mencegah kebocoran modul server tanpa overhead 15.958 `resolveId` SvelteKit (cek pola target + `getModuleInfo().importers` saat error). |
| **Eliminasi Runtime `<template server-only>`, HMR `setup/server`, & Asset URL Rewrite** | `@aureliajs/vite-plugin-aux` | Menutup celah compiler `.aux` agar 0-byte JS di client untuk blok `server-only` dan setara fitur aset `@aurelia/vite-plugin`. |
| **Support `<script setup>` + `<script server>` AST & CLI `aux-check`** | `vscode-aux` (+ `vite-plugin-aux`) | Memberikan autocomplete, type-safety `loader()` → template, dan static check setara `svelte-check` untuk file `.aux`. |
| **Pre-Hydration Event Replay** | `@aureliajs/islands` | Merekam interaksi user saat chunk `island="interaction"` sedang diunduh lalu memutarnya ulang setelah mount. |

### 2.3 Ide SvelteKit yang Ditolak (*Reject — Paradigm Mismatch*)

1. **File-System Routing Wajib (`+page`/`+layout`/`(group)`)**: Memaksa konvensi direktori tunggal menabrak kekuatan utama Hono (eksplisit, modular `app.route()`, cocok dengan OpenAPI/RPC) dan fleksibilitas `@aurelia/router`. Jika nanti ada kebutuhan folder routing, sifatnya harus *opt-in plugin* di `@hono/aurelia`, bukan aturan inti.
2. **`hooks.server.ts` + `AsyncLocalStorage` (`getRequestEvent`)**: Kalah bersih dari Hono middleware pipeline (`c.var`, `WeakMap<Request>`) dan Aurelia DI (`IRequestContext`). Terlihat jelas di `harijadi/src/hooks.server.ts` yang terpaksa menulis regex `extractRouteGroup` monolitik.
3. **Compiler-Stubbed `*.remote.ts` RPC**: Transformasi AST bundler yang menyulap fungsi server menjadi panggilan `fetch` implisit menyembunyikan batas jaringan. Hono RPC (`hc<AppType>`) sudah memberi *type safety* penuh secara eksplisit tanpa *bundler magic*.
4. **`devalue.uneval()` Inline Script Execution**: Mengeksekusi JS literal inline di HTML merusak kompatibilitas strict CSP tanpa `'unsafe-inline'`. Kita tetap memilih inert `<script type="application/json">`.
5. **Codegen Global `.svelte-kit/types` (`$types`) di Aurelia Core**: Kelas TypeScript + DI Aurelia + Hono RPC sudah *type-safe* secara native tanpa memerlukan direktori bayangan di `node_modules/$app`. (Inferensi tipe lokal hanya dibutuhkan untuk `.aux` SFC di `vscode-aux`).
6. **`@vercel/nft` Node File Tracing & Manual Postbuild Patch**: Terbukti di log `harijadi` menghasilkan warning dependensi opsional (`bufferutil`, `@opentelemetry/api`) dan memaksa skrip patch manual (`fix-vercel-nft.js`). Pendekatan **Hono native adapters + single-bundle builder** (`Bun.build` / `Rolldown`) jauh lebih deterministik.
7. **Offline Outbox Queue (`checkInQueue.ts`) di Core Library**: Merupakan *domain logic* aplikasi; library kita cukup menyediakan hook `cancel()` pada `au-enhance` agar *zero application leakage* tetap terjaga.

---

## 3. Roadmap Prioritas (Short, Mid, Long Term)

### 🟢 Short-Term (Fondasi Bersih, Keamanan, & Kontribusi Cepat)
1. **Upstream Bugfix PRs (`packages/upstream/aurelia`)**:
   - Siapkan reproduksi minimal dan ajukan 3 PR terpisah: (a) `TemplateElementFactory` cache per `Document` (`packages/template-compiler/src/template-element-factory.ts`), (b) snapshot `Array.from(el.attributes)` di `_classifyAttributes` (`packages/template-compiler/src/template-compiler.ts`), dan (c) fallback `adoptNode` & `getPropertyPriority` (`template-compiler.ts`, `rendering.ts`, `show.ts`).
2. **Keamanan & Isolasi Subpath di `@hono/aurelia`**:
   - Tambahkan validasi CSRF `Origin` / `Sec-Fetch-Site` default pada `aureliaAction()` di `packages/hono-aurelia/src/adapter.ts`.
   - Hapus re-export `builder.ts` (`node:fs`) dari `packages/hono-aurelia/src/index.ts` dan `server.ts` agar entry utama aman di Edge/Cloudflare Workers (gunakan subpath `./build` sesuai `packages/hono-aurelia/package.json:25-29`).
3. **Hardening `@aureliajs/vite-plugin-aux`**:
   - Auto-deteksi `isServer` dari Vite environment/SSR transform opts di `packages/vite-plugin-aux/src/index.ts`.
   - Perbaiki `handleHotUpdate` (`index.ts:236-272`) agar ikut mendeteksi perubahan `setupScript` dan `serverScript`.
   - Tambahkan *lazy server-only import guard* (cek `*.server.*`, `node:*`, `jsdom`, `linkedom` di bundle client dengan penelusuran `getModuleInfo` hanya saat error).
4. **Upgrade Serialisasi di `@aureliajs/ssr`**:
   - Integrasikan mode JSON `devalue.stringify`/`parse` di `packages/aurelia-ssr/src/serialize.ts` dan `hydrate.ts` agar `Date`, `Map`, `Set`, `BigInt`, dan siklus terhidrasi utuh tetap di dalam `<script type="application/json">`.

### 🟡 Mid-Term (Paritas Ergonomi SvelteKit + Keunggulan Islands)
1. **Progressive Form Enhancement & Soft Navigation di `@hono/aurelia`**:
   - Buat `packages/hono-aurelia/src/enhance.ts` (diekspos via `./client`) berisi Custom Attribute `au-enhance` dengan lifecycle hooks (`onSubmit`, `cancel()`, `onResult`, auto-revalidation ke `dataEndpoint`).
   - Buat client navigator ringan (`data-au-preload="hover|tap"`, link interception, `invalidate(url)`) di `packages/hono-aurelia/src/client.ts` dan dukungan layout wrapper (`aureliaLayout`) di `adapter.ts`.
2. **Non-Destructive Hydration & Sinkronisasi Aurelia `2.0.0-rc.3+` / `master`**:
   - Setelah upstream merilis `PR #2561` & `#2563` (dan diskusi `#2538` selesai), update `packages/aurelia-ssr/src/render.ts` agar memancarkan `ssrScope` + text-node markers (`preserveMarkers: true`), serta hilangkan workaround `settle` ketika `IPendingTasks`/`whenStable` (`#2534`) tersedia.
   - Aktifkan pengujian adopsi DOM `preserveMarkers: true` di `packages/ssr-playground/src/engine/inspector.ts`.
3. **DX `.aux` SFC Kelas Satu (`vite-plugin-aux` & `vscode-aux`)**:
   - Extend `packages/vscode-aux/src/parser.ts` dan `analyzer.ts` untuk mem-parsing `<script setup>` & `<script server>`, serta memvalidasi binding template terhadap variabel `let` dan tipe return `loader()`.
   - Tambahkan stripping runtime client untuk `<template server-only>` dan *template asset URL rewriting* di `packages/vite-plugin-aux/src/compiler.ts`.
   - Perkenalkan `packages/aurelia-islands/src/loader.ts` dengan *pre-hydration event replay* dan `props` DI-safe instantiation.

### 🔴 Long-Term (Evolusi Ekosistem & Standar Industri)
1. **Partisipasi RFC Upstream `@aurelia/router` & Incremental Hydration**:
   - Ajukan/kolaborasikan RFC untuk `router.invalidate()`, *declarative link preloading*, dan *history state snapshot* pada `@aurelia/router`, serta penyelarasan `IslandTemplateController` (`packages/aurelia-islands/src/island-controller.ts`) dengan RFC `#2537` & PR `#2560` (`defer`).
2. **Deferred Streaming Hydration & SSE Live Helpers**:
   - Dukung streaming chunk `<script type="application/json">` untuk unawaited promises loader di `packages/hono-aurelia/src/adapter.ts` + helper `aureliaStream()` berbasis `AsyncGenerator` (`text/event-stream`).
3. **CLI `aux-check` & `defineEnv` Standard Schema**:
   - Sediakan `aux-check` di `@aureliajs/vite-plugin-aux` (memanfaatkan analyzer AST `vscode-aux`) untuk validasi template+script `.aux` di CI, serta helper `defineEnv` yang aman untuk Hono `c.env` dan `process.env`.

---

## 4. Urutan Eksekusi Kontribusi Etis ke Upstream (`aurelia/aurelia`)

Mengikuti *Ethical Contribution Playbook* di [`02-contribution-procedure.md`](./02-contribution-procedure.md#L183-L212), berikut urutan langkah disiplin yang wajib diikuti sebelum menyentuh atau mengirim PR ke `aurelia/aurelia`:

1. **Langkah 1 — Sinkronisasi & Audit Issue Aktif (Read-Only)**:
   - Pantau status terkini pada issue `#2494` (`TemplateElementFactory` cache), `#2534` (`whenStable`), `#2536` (Router SSR/SSG), `#2537` (RFC incremental hydration), `#2538` (SSR server cost), serta PR `#2559`, `#2560`, `#2565`, `#2574` agar tidak membuat PR duplikat.
2. **Langkah 2 — Diskusi Singkat di Issue `#2494` & Buka Issue Baru untuk `NamedNodeMap` / `adoptNode`**:
   - Komentari `#2494` dengan ringkasan *root cause* `markupCache` lintas dokumen (`AUR0757`) yang teramati di SSR konkuren, dan tanyakan kepada maintainer (`fkleuver` / `Vheissu`) apakah pendekatan `WeakMap<Document, ...>` atau instance cache yang disukai.
   - Laporkan temuan spesifik `_classifyAttributes` (`template-compiler.ts:743-779`) yang bergantung pada *live* `NamedNodeMap` dan menyebabkan kegagalan pada DOM non-live seperti LinkeDOM.
3. **Langkah 3 — Reproduksi Minimal & Validasi Lokal di Fork (`packages/upstream/aurelia`)**:
   - Buat branch terpisah per isu dari `upstream/master` di fork `sandikodev/aurelia`.
   - Tulis test regresi di `packages/__tests__` (Node test suite memakai Mocha, **tanpa** memasukkan `linkedom` atau `@aureliajs/*` sebagai dependency upstream; cukup gunakan mock `NamedNodeMap` non-live / multi-JSDOM document) dan verifikasi penuh memakai environment Node 22 + `npm run build` + `npm run lint` + `npm run test-node:*`.
4. **Langkah 4 — Kirim PR Kecil Terisolasi Lebih Dulu (`fix(...)`)**:
   - Urutan kirim PR:
     1. PR #1: `fix(template-compiler): avoid live NamedNodeMap assumption in _classifyAttributes` (kecil, aman, nol perubahan API publik).
     2. PR #2: `fix(template-compiler,runtime-html): guard adoptNode and getPropertyPriority for non-browser DOMs` (2–3 baris guard).
     3. PR #3: `fix(template-compiler): scope template markup cache per document` (terkait `#2494`, setelah konfirmasi desain dari maintainer).
   - Sertakan file `.changeset/*.md` (`patch` pada `aurelia`), patuhi Conventional Commits (`commitlint`), isi lengkap `.github/PULL_REQUEST_TEMPLATE/bug_fix.md` (cantumkan transparansi bila dibantu AI di *Reviewer Notes*), dan tandatangani CLA jika prompt PR memintanya.
5. **Langkah 5 — Konsultasi Desain untuk Fitur Menengah (`props` di `IAppRootConfig` & Router SSR)**:
   - Setelah PR bugfix dasar diterima dan kepercayaan maintainer terbangun, baru ajukan komentar konstruktif di `#2536`/`#2538` atau buka RFC memakai `.github/ISSUE_TEMPLATE/rfc.md` untuk `IAppRootConfig.props`, `router.invalidate()`, preloading, dan *history snapshot*. Jangan pernah mengirim *surprise mega-PR*.
