# 01 — Anatomi Aurelia 2 Core & Akar Masalah SSR/Tooling

Analisis menyeluruh atas monorepo upstream `aurelia/aurelia` di `packages/upstream/aurelia` (commit `af6288674`, tag rilis terakhir `v2.0.0-rc.2`), beserta pemetaan *root cause* atas *workaround* di ekosistem kita (`@aureliajs/ssr`, `@aureliajs/islands`, `@aureliajs/vite-plugin-aux`, `@hono/aurelia`) dan daftar kandidat kontribusi upstream yang terurut berdasarkan dampak dan risiko.

---

## 1. Peta Paket (*Package Graph*) & Peran

Seluruh paket di `packages/upstream/aurelia/packages/` dan `packages-tooling/` berada pada versi `2.0.0-rc.2` (kecuali paket privat `__tests__`, `addons` di `2.0.0-rc`, dan `__tests__cjs` di `2.0.0-beta.25`).

### 1.1 Lapisan Fondasi (*Core Primitives*)

| Paket | Peran | Dependensi Langsung | Path |
| --- | --- | --- | --- |
| `@aurelia/metadata` | Utilitas refleksi & `Symbol.metadata` (TC39 Stage 3 decorator metadata) tanpa dependensi eksternal | — | `packages/metadata/package.json` |
| `@aurelia/platform` | Abstraksi lingkungan JS generik (`Platform`, `setTimeout`, `queueMicrotask`, `Reflect`, `performanceNow`, error `AUR1005`) | — | `packages/platform/src/index.ts` |
| `@aurelia/platform-browser` | `BrowserPlatform` yang mengikat `window`, `document`, `Node`, `Element`, `CustomEvent`, `CSSStyleSheet`, `MutationObserver`, `fetch`, `rAF` per global/window via `WeakMap` | `@aurelia/platform` | `packages/platform-browser/src/index.ts` |
| `@aurelia/kernel` | DI `Container`, `resolve()`, `Registration`, `EventAggregator`, `ILogger`, `IModuleLoader`, `ResourceType`, error `AUR0001–0024` | `@aurelia/metadata`, `@aurelia/platform` | `packages/kernel/src/` |
| `@aurelia/expression-parser` | Parser & AST ekspresi binding Aurelia (`AccessScope`, `Interpolation`, `ForOfStatement`, `ValueConverter`, `BindingBehavior`, dll.) | `@aurelia/kernel` | `packages/expression-parser/src/` |

### 1.2 Lapisan Compiler, Runtime, & Templating

| Paket | Peran | Dependensi Langsung | Path |
| --- | --- | --- | --- |
| `@aurelia/template-compiler` | `TemplateCompiler`, `TemplateElementFactory`, `AttrParser`, `AttributePattern`, `BindingCommand`, kompilasi HTML ke instruction table + `<!--au-->` comment markers | `@aurelia/metadata`, `@aurelia/kernel`, `@aurelia/expression-parser` | `packages/template-compiler/src/` |
| `@aurelia/runtime` | Sistem reaktivitas & observasi (proxy, getter/setter, computed, array/map/set observers), `Scope`, `TaskQueue` (`tasksSettled`), `astEvaluate` | `@aurelia/kernel`, `@aurelia/expression-parser`, `@aurelia/metadata`, `@aurelia/platform` | `packages/runtime/src/` |
| `@aurelia/runtime-html` | `Aurelia`, `AppRoot`, `Controller`, `Rendering`, `FragmentNodeSequence`, `StandardConfiguration`, built-in CEs/CAs/TCs (`if`, `repeat`, `with`, `switch`, `promise`, `portal`, `au-compose`, `au-slot`, `show`), protokol SSR & hydration (`ISSRContext`, `ISSRScope`, `hydrateSSRDefinition`) | `@aurelia/kernel`, `@aurelia/metadata`, `@aurelia/platform`, `@aurelia/platform-browser`, `@aurelia/runtime`, `@aurelia/expression-parser`, `@aurelia/template-compiler` | `packages/runtime-html/src/` |
| `aurelia` | Meta-paket baterai-lengkap untuk aplikasi browser: mengekspor `PLATFORM = BrowserPlatform.getOrCreate(globalThis)`, `Aurelia` wrapper dengan auto-default container & `document.querySelector` host lookup | `@aurelia/fetch-client`, `@aurelia/kernel`, `@aurelia/metadata`, `@aurelia/expression-parser`, `@aurelia/platform`, `@aurelia/platform-browser`, `@aurelia/runtime`, `@aurelia/template-compiler`, `@aurelia/runtime-html` | `packages/aurelia/src/index.ts`, `packages/aurelia/package.json` |

### 1.3 Routing, Fitur Ekosistem, & Testing

| Paket | Peran | Dependensi Utama | Path |
| --- | --- | --- | --- |
| `@aurelia/route-recognizer` | Radix/trie path matcher & generator parameter (`RouteRecognizer`, `RESIDUE`) | `@aurelia/kernel` | `packages/route-recognizer/package.json` |
| `@aurelia/router` | Router resmi utama (**dulu bernama `@aurelia/router-lite`**, di-rename di commit `afbd76be1` / PR `#2186`): `Router`, `RouteContext`, `LazyRoute`, `ViewportCustomElement`, `ServerLocationManager`, `canLoad`/`loading`/`canUnload`/`unloading` | `@aurelia/route-recognizer`, `@aurelia/runtime-html`, dll. | `packages/router/src/` |
| `@aurelia/router-direct` | Router direct-routing alternatif (**dulu bernama `@aurelia/router`** sebelum PR `#2186`) dengan model viewport/endpoint routing tersendiri | `@aurelia/route-recognizer`, `@aurelia/template-compiler`, `@aurelia/runtime-html`, dll. | `packages/router-direct/src/` |
| `@aurelia/state` | State management berbasis store & action handler (`@fromState`, binding behavior `& state`) | `@aurelia/runtime-html`, `@aurelia/template-compiler` | `packages/state/src/` |
| `@aurelia/store-v1` | Porting RxJS store dari Aurelia v1 (`rxjs`) | `@aurelia/runtime-html`, `rxjs` | `packages/store-v1/package.json` |
| `@aurelia/validation` | Engine validasi model, rule builder, serializer AST validasi | `@aurelia/runtime`, `@aurelia/runtime-html` | `packages/validation/src/` |
| `@aurelia/validation-html` | Integrasi DOM & binding behavior `& validate` | `@aurelia/validation`, `@aurelia/runtime-html` | `packages/validation-html/package.json` |
| `@aurelia/validation-i18n` | Integrasi pesan validasi dengan `@aurelia/i18n` | `@aurelia/validation-html`, `@aurelia/i18n` | `packages/validation-i18n/package.json` |
| `@aurelia/i18n` | Wrapper `i18next` dengan value converters (`t`, `df`, `nf`, `rt`) & custom attribute `t` | `@aurelia/runtime-html`, `i18next` | `packages/i18n/src/` |
| `@aurelia/fetch-client` | `HttpClient` berbasis Web `fetch` dengan interceptor pipeline (`RetryInterceptor`, `CacheInterceptor`) | `@aurelia/kernel`, `@aurelia/metadata` | `packages/fetch-client/src/` |
| `@aurelia/dialog` | Layanan dialog modal (`IDialogService`, `DialogController`, implementasi standard `<dialog>` & classic) | `@aurelia/runtime-html` | `packages/dialog/src/` |
| `@aurelia/ui-virtualization` | `virtual-repeat` untuk daftar panjang berbasis viewport scrolling | `@aurelia/runtime-html`, `@aurelia/template-compiler` | `packages/ui-virtualization/package.json` |
| `@aurelia/web-components` | Adapter untuk mengekspor Custom Element Aurelia sebagai native Web Component (`customElements.define`) | `@aurelia/runtime-html` | `packages/web-components/package.json` |
| `@aurelia/compat-v1` | Lapisan kompatibilitas migrasi Aurelia v1 (`.delegate`, `.call`, `viewResources`, dll.) | `@aurelia/runtime-html` | `packages/compat-v1/package.json` |
| `@aurelia/testing` | Utilitas unit/integration test (`createFixture`, `TestContext`, `assert`, `h`) | `@aurelia/runtime-html`, `@aurelia/template-compiler` | `packages/testing/src/` |
| `@aurelia/addons` | Paket privat internal untuk eksperimen addon | `@aurelia/runtime-html` | `packages/addons/package.json` |

### 1.4 Lapisan Tooling (`packages-tooling/`)

| Paket | Peran | Dependensi Kunci | Path |
| --- | --- | --- | --- |
| `@aurelia/plugin-conventions` | Inti konvensi build-time: pairing `.ts/.js` ↔ `.html` ↔ `.css`, metadata stripping (`parse5`), AST transform (`@typescript/typescript6` + `modify-code`), dan `template-typechecking` eksperimental | `@aurelia/template-compiler`, `@aurelia/runtime-html`, `@typescript/typescript6`, `modify-code`, `parse5` | `packages-tooling/plugin-conventions/src/` |
| `@aurelia/vite-plugin` | Plugin Vite (dev aliasing `/development`, virtual `.$au.ts`, HMR, bundling asset template via `parse5`, dan transformasi TC39 standard decorators via `@swc/wasm` untuk Vite 8) | `@aurelia/plugin-conventions`, `@swc/wasm`, `@swc/helpers`, `parse5`, `get-tsconfig` | `packages-tooling/vite-plugin/src/` |
| `@aurelia/webpack-loader` | Loader Webpack memanggil `preprocess` + `nodeFileUnitHost` dan menyuntikkan HMR berbasis `module.hot` | `@aurelia/plugin-conventions`, `loader-utils` | `packages-tooling/webpack-loader/src/index.ts` |
| `@aurelia/parcel-transformer` | Transformer Parcel di atas `@aurelia/plugin-conventions` | `@aurelia/plugin-conventions`, `@parcel/plugin` | `packages-tooling/parcel-transformer/package.json` |
| `@aurelia/plugin-gulp` | Adapter stream Gulp berbasis `vinyl` | `@aurelia/plugin-conventions`, `vinyl` | `packages-tooling/plugin-gulp/package.json` |
| `@aurelia/babel-jest` | Transformasi Jest via `@babel/core` + konvensi | `@aurelia/plugin-conventions`, `@babel/core` | `packages-tooling/babel-jest/package.json` |
| `@aurelia/ts-jest` | Transformasi Jest via `ts-jest` + konvensi | `@aurelia/plugin-conventions`, `ts-jest` | `packages-tooling/ts-jest/package.json` |

Catatan penting: Di repo kita (`package.json`), versi Aurelia yang digunakan adalah `2.0.0-rc.2` — **tepat sama dengan versi paket di monorepo ini**. Selain itu, penyebutan *router-lite* di dokumentasi lama kini sudah resmi menjadi `@aurelia/router` (sejak PR `#2186`, commit `afbd76be1`).

---

## 2. Build/Test Tooling & Status Rilis

1. **Monorepo & Build**:
   - Menggunakan **npm workspaces** (`packageManager: "npm@10.9.0"`, `node >= 22.22.2 <23` di root `packages/upstream/aurelia/package.json:5-75`) dan **Turborepo** (`turbo.json`).
   - Build library memakai **Rollup** (`rollup -c`) yang menghasilkan CJS + ESM + bundle `/development` (dengan `__DEV__ = true`), diikuti `tsc --emitDeclarationOnly` untuk `.d.ts` (`packages/router/package.json:6-20,48-53`).
   - Linting memakai **ESLint 8.53** (`eslint-plugin-import`, `eslint-plugin-jsdoc`, `eslint-plugin-mocha`), dan commit diwajibkan mengikuti **Conventional Commits** lewat `@commitlint/cli` + `husky` (`package.json:158-224`).
2. **Test Infrastructure**:
   - `packages/__tests__/package.json`:
     - **Node tests**: Mocha + `jsdom` (`24.1.0`) + `cssstyle` + `nwsapi` (`test-node:*`).
     - **Browser tests**: Karma + Mocha + ChromeHeadless/FirefoxHeadless/Safari (`test-chrome`, `test-firefox`, `test-safari`).
     - **Runner/Contract tests**: Node `--test` (`z-scripts/*.spec.cjs`).
   - `packages/__e2e__/`: 17 suite E2E (termasuk `14-vite8-decorators`, `17-vite-template-assets`, `5-router-direct`, `6-router`, HMR Vite & Webpack).
3. **Status Rilis (`v2.0.0-rc.2` vs `master`)**:
   - Tag `v2.0.0-rc.2` ada di repo, namun `master` sudah melaju **50 commit** di depan `v2.0.0-rc.2` (`git log v2.0.0-rc.2..HEAD --oneline`), termasuk fitur dan perbaikan besar seperti lazy route factories (`#2556`), SSR text-node round-trip (`#2563`), `hydrate()` melalui `start()` (`#2561`), dan `else if` (`#2453`).
   - `.changeset/pre.json` masih berstatus `"mode": "pre", "tag": "rc"` dengan puluhan file changeset belum dirilis di `.changeset/*.md`. Workflow rilis di `.github/workflows/release.yml` dan `.github/workflows/dev-prerelease.yml` dikelola otomatis via Changesets.

---

## 3. Status SSR & Hydration di Core

Aurelia 2 sudah memiliki fondasi protokol SSR/hydration di `@aurelia/runtime-html`, namun statusnya masih **parsial (primitif klien/protokol ada, producer SSR & ergonomis produksi masih dalam pengerjaan)**.

### 3.1 Yang Sudah Ada di Core (`master`)

1. **`ISSRContext` & Marker Preservation** (`packages/runtime-html/src/templating/ssr.ts:98-104`, `rendering.ts:89,165`, `dom.ts:328-343`):
   - `ISSRContext` menyediakan flag `preserveMarkers: boolean`. Jika `true`, `FragmentNodeSequence` tidak menghapus komentar `<!--au-->` saat merender sehingga HTML yang diserialisasi siap di-hydrate di browser.
2. **`Aurelia.hydrate()` vs `Aurelia.enhance()`** (`packages/runtime-html/src/aurelia.ts:74-128`):
   - `enhance()` mengompilasi DOM host eksisting sebagai template baru (`enhance: true`).
   - `hydrate({ host, component, ssrScope, container })` mengadopsi DOM hasil SSR tanpa membuat ulang node dari template, dengan syarat definisi komponen (`$au`) sudah terkompilasi (AOT atau decorator).
   - Pada `master` (PR `#2561`, commit `0bee94eb8`), `hydrate()` kini memanggil `restoreSSRTextNodes(config.host)` lalu lewat `this.start(appRoot)` sehingga `isRunning`, `host.$aurelia`, event `au-started`, dan `stop()` berfungsi konsisten. (**Catatan**: versi `2.0.0-rc.2` yang dipakai repo kita belum memiliki perbaikan `#2561` maupun `#2563`!)
3. **Protokol Text Node Round-Trip** (`packages/runtime-html/src/templating/ssr.ts:186-248`, `packages/runtime-html/README.md:15-70`, PR `#2563`):
   - `prepareSSRForSerialization(root)` mengganti text node kosong menjadi `<!--au-e-->`, menyisipkan `<!--au-t-->` di antara text node bersebelahan, dan menaruh `<!--au-hm-->` di awal root (melewati `<script>`, `<style>`, `<textarea>`, `<title>`).
   - `restoreSSRTextNodes(host)` memulihkan batas text node sebelum `Controller.$el` melakukan adopsi (`adoptNodes`).
   - Mendukung instruksi `InterpolationInstruction.isTextContent = true` untuk `<textarea>` dan `<title>` (`packages/runtime-html/src/renderer.ts:491-515`).
4. **Adopsi DOM & Manifest `ISSRScope`** (`packages/runtime-html/src/templating/ssr.ts:56-170`, `dom.ts:367-420`, `controller.ts:502-507`, `rendering.ts:169-238`):
   - `ISSRManifest` / `ISSRScope` / `ISSRTemplateController` memetakan pohon controller dan `nodeCount` untuk scope *containerless*.
   - `FragmentNodeSequence.adoptChildren` dan `adoptSiblings` mengadopsi DOM eksisting; `hydrateSSRDefinition()` (`ssr.ts:338-578`) menerjemahkan *wire format* `ISSRDefinition` menjadi `IInstruction[][]`.
   - Template controller bawaan yang sudah mendukung `ssrScope`: `If` (`resources/template-controllers/if.ts:50-53`), `Repeat` (`repeat.ts:684-687`), `With` (`with.ts:50-53`), `Switch` (`switch.ts:62-81`), serta `@aurelia/router` (`packages/router/src/route-context.ts:544-561`, `component-agent.ts:91-111`).

### 3.2 Kekurangan & Issue/PR/RFC Terbuka di GitHub (`aurelia/aurelia`)

Audit SSR upstream yang intensif (Sep–Nov 2026) melahirkan daftar issue dan PR terbuka yang sangat relevan:

- **PR terbuka (sedang aktif menuju core)**:
  - `PR #2574`: `feat(runtime-html): transfer server state to the client for hydration` (menjawab `#2535`).
  - `PR #2559`: `feat(runtime-html,router): add document head management` (menjawab `#2546`).
  - `PR #2560`: `feat(runtime-html): add defer template controller for deferred rendering` (menjawab `#2544`).
  - `PR #2565`: `feat(runtime-html): add error boundaries and IErrorHandler` (menjawab `#2542`).
- **Issue & RFC terbuka (belum selesai di core)**:
  - `#2494`: *Module-level template cache keeps documents alive and returns nodes from the wrong document* (lihat §6.1).
  - `#2527`: Hydration salah mengikat node saat view template controller langsung berisi template controller lain.
  - `#2528`: Hydration men-detach dan me-reinsert seluruh node server-rendered (menghilangkan fokus & me-reload iframe).
  - `#2530`: Hydration menganggap setiap tag bertanda hubung (`-`) sebagai boundary komponen Aurelia (merusak Web Components).
  - `#2531`: `containerless`, `au-compose`, `au-slot`, `promise`, dan Shadow DOM belum dapat di-hydrate.
  - `#2533`: Belum ada deteksi hydration mismatch & fallback otomatis ke client render (meski error code `822–824` sudah mulai ditambahkan di `runtime-html/src/errors.ts:145-147`).
  - `#2534`: Belum ada API stabilitas aplikasi (`IPendingTasks` / `Aurelia#whenStable()`) untuk mengetahui kapan async work (`canLoad`, `promise.bind`, `fetch-client`) selesai sebelum HTML diserialisasi.
  - `#2536`: Router SSR/SSG belum punya sinyal HTTP status (`404`, redirect), config render mode per rute, maupun `discoverRoutes(container)` untuk SSG prerendering.
  - `#2537` *(RFC)*: Incremental hydration (`hydrate.on="visible|interaction|idle|timer|never"`) & pre-hydration event replay.
  - `#2538`: Biaya server SSR — perlu flag `discardDom` agar `au.stop()` tidak membuang waktu memutasi DOM yang akan langsung dibuang, perekaman manifest langsung saat render (`ISSRContext`), serta format manifest yang lebih ringkas.
  - `#2237`: *Compiler & LSP Roadmap* (rencana AOT/SSR emitter dari `aurelia-ls`).

---

## 4. Kompilasi Pasangan `.html` di `plugin-conventions` & `vite-plugin` (Relevansi ke `.aux`)

Pipeline konvensi resmi Aurelia dirancang untuk model **multi-file pairs** (`foo.ts` + `foo.html` + `foo.css`), berbeda dengan single-file component `.aux` di `@aureliajs/vite-plugin-aux`:

1. **Resolusi Pasangan File** (`packages-tooling/plugin-conventions/src/preprocess.ts:7-58`):
   - Memeriksa ekstensi `templateExtensions` (`.html`), `cssExtensions` (`.css`, `.scss`, dll.), dan `jsExtensions` (`.ts`, `.js`).
   - Untuk `.html`, mencari pasangan `.module.<css>` / `.<css>` serta memeriksa apakah ViewModel `.ts`/`.js` ada (`hasViewModel`).
   - Untuk `.ts`/`.js`, mencari `foo.html` (atau `foo-view.html` untuk `@view()`).
2. **Preprocessing HTML** (`preprocess-html-template.ts:16-207`, `strip-meta-data.ts:27-94`):
   - Mem-parse HTML fragmen dengan `parse5` (`sourceCodeLocationInfo: true`) untuk mencabut elemen metadata khusus Aurelia: `<import>`, `<use-shadow-dom>`, `<containerless>`, `<bindable>`, `<alias>`, dan `<capture>`.
   - Menghasilkan modul JS yang mengimpor `CustomElement` dari `@aurelia/runtime-html`, mengekspor `name`, `template`, `dependencies`, `bindables`, `register(container)`, plus membungkus CSS lewat `shadowCSS()` atau `cssModules()`, serta menyisipkan kode HMR jika HTML berdiri sendiri (*template-only component*).
3. **Preprocessing TypeScript/Resource** (`preprocess-resource.ts:154-220`):
   - Menggunakan parser AST `@typescript/typescript6` + `modify-code` untuk menganalisis ekspor kelas, mendekorasi atau menyuntikkan static `$au` definition (nama konvensi + template import + `dependencies` lokal), dan mendukung `experimentalTemplateTypeCheck` (`template-typechecking.ts`).
4. **Integrasi Vite (`@aurelia/vite-plugin`)** (`packages-tooling/vite-plugin/src/index.ts:60-200`):
   - `devPlugin`: mengarahkan import `aurelia` dan `@aurelia/*` ke `/development` saat non-production.
   - `auPlugin`: menjalankan `preprocess()` pada `transform`, serta membuat virtual module `.$au.ts` di `resolveId`/`load` saat mengimpor `.html` pada mode `build`.
   - `transformTemplateAssetUrls` (`template-assets.ts:62-114`): mem-parse HTML dengan `parse5` untuk mengubah atribut aset statis (`img[src]`, `srcset`, `link[href]`, `video[poster]`, dll.) menjadi ESM `import` Vite (kecuali ada atribut `au-vite-ignore`).
   - `createStandardDecoratorPlugin` (`standard-decorators.ts:49-120`): karena Vite 8 memakai **Oxc** yang berpotensi membuang field decorators atau belum memproses TC39 2023-11 decorators secara penuh sesuai kebutuhan Aurelia, plugin ini menjalankan `@swc/wasm` (`decoratorVersion: '2023-11'`) di fase `enforce: 'pre'` sebelum Oxc, lengkap dengan resolusi `@swc/helpers/_/*`.

**Perbandingan dengan `@aureliajs/vite-plugin-aux` (`packages/vite-plugin-aux/src/index.ts`)**:
- `@aureliajs/vite-plugin-aux` sudah mengadopsi pola modern yang tepat — mengompilasi `.aux` SFC dengan `@swc/wasm` (`decoratorVersion: '2023-11'`) + `transformWithOxc` bawaan Vite 8, sekaligus mengekstrak metadata template & scoped CSS.
- Namun ada peluang belajar/sinergi dari `@aurelia/vite-plugin`: (a) `templateAssets` rewriting (`parse5`-based asset URL imports) belum ada di `.aux` atau perlu disejajarkan, (b) `useDev` aliasing ke `/development`, dan (c) kemampuan `plugin-conventions` menerima file API kustom (`IFileUnitHost`, commit `3e181102a` / `#2452`) dapat dimanfaatkan jika ingin berbagi konvensi metadata `<import>` / `<bindable>`.

---

## 5. Kapabilitas Router vs Model `load` / `+layout` SvelteKit

`@aurelia/router` (`packages/router/src/`) adalah router *full-featured* berbasis komponen dan `RouteContext` hierarkis:

1. **Lazy Routes & Code Splitting**:
   - Mendukung `import('./page')` langsung dan **baru saja** menambahkan `LazyRoute` *factory* (`() => import('./page')`) di commit `af6288674` (`#2556`, `packages/router/src/route-context.ts:744-808,956-984`). Factory tidak dipanggil saat startup (kecuali `useEagerLoading: true`), retry otomatis bila gagal jaringan, dan memperbarui `NavigationModel` setelah modul dimuat.
2. **Lifecycle Hooks & Guards**:
   - `IRouteViewModel` (`packages/router/src/component-agent.ts:16-23`): `getRouteConfig()`, `canLoad()`, `loading()`, `loaded()`, `canUnload()`, `unloading()`.
   - Dieksekusi dalam pipeline `Transition` + `Batch` di `Router._run()` (`packages/router/src/router.ts:615-650`) secara terurut: `canUnload` (bottom-up) → `canLoad` (top-down) → `unloading` (bottom-up) → `loading` (top-down) → `_swap` (mount ke `<au-viewport>`).
   - `canLoad` dapat mengembalikan `boolean` atau `NavigationInstruction` untuk redirect.
3. **Nested Layouts & Multi-Viewport**:
   - Layout dibentuk melalui komponen parent yang merender `<au-viewport>` (`packages/router/src/resources/viewport.ts`) dan mendefinisikan `routes` anak (atau `getRouteConfig`). Mendukung *named viewports* dan sibling routes (`router.load(['a', 'b'])`).
4. **Dukungan SSR Saat Ini**:
   - Menyediakan `ServerLocationManager` (`packages/router/src/location-manager.ts:199-220`) dan adopsi DOM host elemen routed component di `RouteContext._resolveHostElement` (`route-context.ts:544-561`).

### Perbandingan dengan SvelteKit (`load` / `+layout` / `.server`)

| Aspek | `@aurelia/router` | SvelteKit | Kesenjangan untuk SSR/Fullstack |
| --- | --- | --- | --- |
| **Data Loading** | `loading(params, next, current)` adalah method *instance* pada ViewModel (`componentInstance` dibuat dulu via `container.invoke` di `route-context.ts:520`). | Fungsi `load()` murni terpisah dari komponen (`+page.ts` / `+page.server.ts`), berjalan sebelum atau paralel dengan render tanpa butuh DOM/instance. | `loading()` Aurelia tidak punya pemisahan eksekusi *server-only*, tidak otomatis men-serialize hasilnya ke HTML, dan menyebabkan *double fetch* saat client `hydrate()` (dibahas di `#2535` / `PR #2574`). |
| **Layouts** | Komponen parent + `<au-viewport>` + `routes: [...]` atau `@route`. Sangat fleksibel untuk multi-viewport. | Konvensi file-system `+layout.svelte` + `+layout.server.ts` dengan pewarisan data `parent()`. | Aurelia berbasis kelas/DI bukan konvensi file-system (konvensi file-system lebih cocok di lapisan meta-framework seperti `@hono/aurelia`, bukan memaksa ke `@aurelia/router` inti). |
| **HTTP Status & Redirect SSR** | `ServerLocationManager` hanya menyimpan `_path` dan mengembalikan `normalizePath(this._path)`; redirect atau fallback tidak melaporkan status `302`/`404` ke server HTTP. | `redirect(302, ...)` dan `error(404, ...)` langsung memengaruhi HTTP response. | Kesenjangan nyata di core — persis yang diusulkan di issue `#2536`. |
| **Route Discovery (SSG)** | Rute anak bisa dinamis atau lazy (`LazyRoute`). | Manifest rute statis build-time dari struktur direktori. | Belum ada `discoverRoutes(container)` untuk SSG prerendering (`#2536`). |

---

## 6. Root Cause di Core atas 6 Workaround di Paket Kita

Seluruh *workaround* pada `packages/aurelia-ssr/src/render.ts` dan `packages/aurelia-islands/src/loader.ts` terpetakan langsung ke perilaku spesifik di kode sumber `packages/upstream/aurelia`:

### 6.1 `AUR0757` — Template Caching Lintas Dokumen
- **Gejala di paket kita**: Request SSR kedua dan seterusnya pada komponen yang sama melempar `AUR0757` (`packages/aurelia-ssr/test/multi-request.test.ts:6,33`), sehingga kita membuat `SsrTemplateElementFactory` (`packages/aurelia-ssr/src/render.ts:174-218`) dan `templateFactory` inline (`packages/aurelia-islands/src/loader.ts:113-131`).
- **Root cause di core**:
  - `packages/template-compiler/src/template-element-factory.ts:16`:
    `const markupCache: Record<string, HTMLTemplateElement | undefined> = {};` — cache diletakkan di **level modul**, dikunci hanya oleh string `input`, tanpa batas eviksi dan tanpa isolasi `Document` / `IPlatform`.
  - Di `TemplateElementFactory.createTemplate()` (`lines 28-51`), request pertama mengisi `markupCache[input]` dengan `<template>` milik `Document` ke-1. Request kedua (dengan `Document` baru dari JSDOM/LinkeDOM) memanggil `result.cloneNode(true)` (`line 50`) yang mengembalikan `<template>` **masih milik `Document` ke-1** (dan juga memicu memory leak menahan seluruh `Document` lama di memori!).
  - Saat `TemplateCompiler.compile()` (`packages/template-compiler/src/template-compiler.ts:122-141`) menyisipkan marker `<!--au-->` dari `Document` ke-2 atau `FragmentNodeSequence` mengumpulkan marker/target lintas dokumen, jumlah target yang ditemukan tidak cocok dengan jumlah baris instruksi (`targetCount !== rowCount`), sehingga `Rendering.render()` (`packages/runtime-html/src/templating/rendering.ts:197-198`) melempar `ErrorNames.rendering_mismatch_length` (`757` di `packages/runtime-html/src/errors.ts:86,228` -> `AUR0757`).
  - Sudah tercatat juga di upstream issue `#2494` (*Module-level template cache keeps documents alive and returns nodes from the wrong document*).

### 6.2 `AUR0016` — No Active Container (`no_active_container_for_resolve`)
- **Gejala di paket kita**: Untuk menyuntikkan `props` ke komponen root sebelum `app.app({ host, component }).start()`, `packages/aurelia-ssr/src/render.ts:319-326` harus memanggil `app.container.get(component)` lebih dulu lalu `Object.assign(rootComponent, props)`. Sementara di `packages/aurelia-islands/src/loader.ts:98-103`, pemanggilan `new candidate()` berisiko melempar `AUR0016` bila komponen memakai `resolve(...)`.
- **Root cause di core**:
  - `packages/kernel/src/di.container.ts:721-724`: `resolve(...keys)` memeriksa variabel modul `currentContainer`. Jika `currentContainer == null`, dilempar `ErrorNames.no_active_container_for_resolve` (`16` di `packages/kernel/src/errors.ts:36,65` -> `AUR0016`).
  - `currentContainer` hanya di-set selama `Factory.construct()` (`packages/kernel/src/di.container.ts:624-673`).
  - Di sisi aplikasi, `IAppRootConfig` (`packages/runtime-html/src/app-root.ts:17-42`) dan `AppRoot` (`lines 113-121`) hanya menerima `component: T | Constructable<T>`, tanpa properti `props` atau `initializer` callback. Jika caller ingin mengisi properti instance sebelum siklus `hydrating`/`binding`, caller terpaksa: (a) melakukan `new Component()` (yang memicu `AUR0016` jika ada `resolve()` di field initializer!), atau (b) melakukan `container.get(Component)` di root container sebelum `AppRoot` membuat `childCtn = container.createChild()`.

### 6.3 Ketergantungan Template Compiler pada Live `element.attributes` (`NamedNodeMap`)
- **Gejala di paket kita**: Di LinkeDOM, `element.attributes` mengembalikan snapshot statis, bukan *live* `NamedNodeMap` sesuai spek WHATWG. Akibatnya loop compiler memproses ulang atribut seperti `repeat.for` dan menghasilkan template controller ganda/rusak — yang memaksa `packages/aurelia-ssr/src/render.ts:71-114` memasang `Proxy` pada `Element.prototype.attributes`.
- **Root cause di core**:
  - `packages/template-compiler/src/template-compiler.ts:743-779` (`_classifyAttributes`, juga dipanggil oleh `_compileSurrogate` di `lines 337-349`):
    ```ts
    const attrs = el.attributes;
    let ii = attrs.length;
    ...
    const removeAttr = this.debug
      ? noop
      : () => {
        el.removeAttribute(attrName);
        --i;
        --ii;
      };
    for (; ii > i; ++i) {
      attr = attrs[i];
    ```
  - Pola `--i; --ii;` setelah `el.removeAttribute(attrName)` **mutlak bergantung** pada `attrs` sebagai *live collection* yang menggeser elemen berikutnya ke indeks `i` saat elemen saat ini dihapus. Pada DOM engine non-live seperti LinkeDOM, panjang `attrs` tidak menyusut dan posisi indeks tidak bergeser, sehingga iterasi berikutnya membaca ulang atribut yang baru saja dihapus dari elemen.
  - (Catatan: pemakaian `el.attributes` lainnya di `template-compiler.ts:403` untuk `<let>`, `:1180` untuk `<bindable>`, dan `:1462` untuk `au-slot` hanya membaca tanpa menghapus atribut di dalam loop.)

### 6.4 `CSSStyleDeclaration.getPropertyPriority`
- **Gejala di paket kita**: LinkeDOM tidak mengimplementasikan `style.getPropertyPriority()`, sehingga `packages/aurelia-ssr/src/render.ts:116-120` melakukan monkey-patch `styleProto.getPropertyPriority = () => ''`.
- **Root cause di core**:
  - `packages/runtime-html/src/resources/custom-attributes/show.ts:67-72`:
    Saat `Show`/`Hide` menyembunyikan elemen, baris 68 memanggil `this.$prio = this.el.style.getPropertyPriority('display');` tanpa feature check (`?.getPropertyPriority?.('display') ?? ''`), dan baris 69 memanggil `this.el.style.setProperty('display', 'none', 'important')`. Tidak ada pemanggil lain di `packages/` non-test (`rg -n "getPropertyPriority"` hanya menemukan `show.ts:68` dan spec test).

### 6.5 `document.adoptNode`
- **Gejala di paket kita**: LinkeDOM tidak menyediakan `document.adoptNode`, memaksa polyfill di `packages/aurelia-ssr/src/render.ts:58-65`.
- **Root cause di core**:
  - Dua lokasi di core memanggil `document.adoptNode` secara langsung tanpa fallback:
    1. `packages/template-compiler/src/template-compiler.ts:1592` (`CompilationContext.h()`): ketika membuat `<template>`, ia memanggil `this.p.document.adoptNode((el as HTMLTemplateElement).content);`.
    2. `packages/runtime-html/src/templating/rendering.ts:158-160` (`Rendering.createNodes()`): ketika `needsImportNode` bernilai `false` (misalnya `template` adalah elemen non-`<template>` atau `Node`), ia memanggil `doc.adoptNode(fragment.cloneNode(true) as DocumentFragment);`.

### 6.6 Per-Container `BrowserPlatform`
- **Gejala di paket kita**: `packages/aurelia-ssr/src/render.ts:293-313` dan `packages/aurelia-islands/src/loader.ts:108-133` harus secara manual membuat `DI.createContainer()`, mendaftarkan `StandardConfiguration`, membuat `new BrowserPlatform(win)`, dan mem-bypass konstruktor default `aurelia`.
- **Root cause di core**:
  - `packages/aurelia/src/index.ts:6-19`: meta-paket `aurelia` mengeksekusi `export const PLATFORM = BrowserPlatform.getOrCreate(globalThis);` saat modul dimuat, dan `new Aurelia()` memakai `createContainer()` yang langsung mengikat singleton global `PLATFORM` tersebut. Ini tidak aman untuk runtime tanpa `globalThis.window` (Node/Bun/Workers SSR) atau skenario multi-window paralel.
  - Sebenarnya `@aurelia/runtime-html` sudah mendukung per-container platform di `AppRoot._createPlatform()` (`packages/runtime-html/src/app-root.ts:199-211`): jika `IPlatform` belum terdaftar di container (`!container.has(IPlatform, false)`), ia otomatis membuat `new BrowserPlatform(host.ownerDocument.defaultView)` — namun gagal dengan `AUR0769` (`errors.ts:217`) jika `host.ownerDocument.defaultView === null`, dan tetap tidak membantu jika pemakai mengimpor `Aurelia` dari paket `'aurelia'` karena `createContainer()` sudah terlanjur mendaftarkan `PLATFORM` global `globalThis`.

---

## 7. Daftar Kandidat Kontribusi Upstream (Terurut Prioritas)

Urutan disusun berdasarkan **rasio dampak-terhadap-risiko**, kemudahan diterima oleh maintainer Aurelia 2, serta keselarasan dengan filosofi inti Aurelia (*DI-first*, *Convention-over-Configuration*, *Direct-DOM*, dan *Web Standards*).

| Peringkat | Kandidat Kontribusi | Tipe | Bukti (`path:line` di Fork) | Risiko | Keselarasan Filosofi Aurelia |
| --- | --- | --- | --- | --- | --- |
| **1** | **Isolasi cache `TemplateElementFactory` per `Document` / instance (perbaiki `#2494` / `AUR0757`)**: Pindahkan `markupCache` dari level modul ke `WeakMap<Document, Map<string, HTMLTemplateElement>>` (atau milik instance `TemplateElementFactory` yang scoped ke `IPlatform.document`). | Bug fix | `packages/template-compiler/src/template-element-factory.ts:16,28-51`; `packages/runtime-html/src/templating/rendering.ts:197-198` | **Rendah** (perilaku single-document di browser tetap identik & ter-cache; memperbaiki memory leak JSDOM di test/SSR). | **Sangat tinggi**: Menghormati kontrak DI per-container `IPlatform` dan mencegah kebocoran state lintas `Document` sesuai Web Standards. |
| **2** | **Hilangkan ketergantungan live `NamedNodeMap` di `TemplateCompiler._classifyAttributes`**: Ambil snapshot `const attrs = Array.from(el.attributes)` (atau iterasi mundur/copy array) sebelum menghapus atribut lewat `el.removeAttribute(attrName)`, tanpa `--i; --ii;`. | Bug fix / hardening | `packages/template-compiler/src/template-compiler.ts:743-779` (dan pemanggilnya di `:337-349`) | **Rendah** (satu fungsi internal; nol perubahan API publik; bisa diuji langsung di suite `template-compiler` & LinkeDOM). | **Sangat tinggi**: Tetap *Direct-DOM*, lebih bersih secara algoritmik, dan membuat compiler kompatibel dengan DOM engine ringan standar (LinkeDOM/Workers). |
| **3** | **Fallback aman `adoptNode` dan `getPropertyPriority` untuk DOM parsial/SSR**: Gunakan `doc.adoptNode?.(...) ?? doc.importNode?.(..., true)` atau fallback aman jika `adoptNode` tidak ada, serta `style.getPropertyPriority?.('display') ?? ''` di `Show`. | Small bug fix | `packages/template-compiler/src/template-compiler.ts:1592`; `packages/runtime-html/src/templating/rendering.ts:160`; `packages/runtime-html/src/resources/custom-attributes/show.ts:68` | **Sangat rendah** (guard optional chaining / fallback 2–3 baris, nol dampak performa pada browser penuh). | **Tinggi**: Mendukung *graceful degradation* lintas runtime Web Standards (edge workers/LinkeDOM) tanpa membebani browser. |
| **4** | **Dukungan `props` / `setup` atau `Aurelia.forHost(host)` di `AppRoot` & `aurelia` (kurangi jebakan `AUR0016` & per-container `BrowserPlatform`)**: Tambahkan opsi `props?: Partial<T>` (atau `configure` hook) pada `IAppRootConfig` agar properti dapat di-assign setelah `childCtn.invoke(component)` tetapi sebelum `hydrating`/`binding`, serta sediakan factory container yang tidak memaksa `globalThis` saat `host` berasal dari dokumen terisolasi. | Small feature / DX | `packages/runtime-html/src/app-root.ts:17-42,113-141,199-211`; `packages/aurelia/src/index.ts:6-20`; `packages/kernel/src/di.container.ts:624-673,721-724` | **Sedang** (menyentuh API publik `IAppRootConfig` / `Aurelia`; perlu diskusi desain ringan agar selaras dengan lifecycle `hydrating`/`binding`). | **Sangat tinggi**: Menjaga pola DI `resolve()` bekerja alami tanpa memaksa user memanggil `container.get()` secara manual atau jatuh ke `AUR0016`. |
| **5** | **Kontribusi ke Router SSR/SSG (`#2536`) & `ISSRContext` server cost (`#2538`)**: (a) Sinyal `redirectedTo` / `status` pada `ServerLocationManager` / `IServerRouteResult` serta `query`/`hash` parsing; (b) `discardDom?: boolean` di `ISSRContext` agar `FragmentNodeSequence.remove()` di-skip saat teardown SSR. | Medium feature (selaras issue terbuka) | `packages/router/src/location-manager.ts:199-220`; `packages/runtime-html/src/templating/ssr.ts:98-104`; `packages/runtime-html/src/dom.ts` (`FragmentNodeSequence.remove`) | **Sedang** (menyentuh `@aurelia/router` dan `runtime-html`; harus berkoordinasi pada issue `#2536` dan `#2538` yang sudah terbuka). | **Tinggi**: Berbasis DI (`ILocationManager`, `ISSRContext`) dan *Web Standards* (HTTP status/redirect & URL parsing) tanpa mengorbankan arsitektur SPA Aurelia. |
| **6** | **Reconciliation, Error Boundary, & Incremental Hydration (`#2533`, `#2534`, `#2537`)**: Partisipasi/kolaborasi RFC pada `IPendingTasks`/`whenStable()`, hydration mismatch fallback otomatis, dan boundary `hydrate.on="..."` + event replay. | RFC-level | `packages/runtime-html/src/templating/rendering.ts:197-199`; `packages/runtime-html/src/aurelia.ts:112-128`; `packages/runtime-html/src/resources/template-controllers/if.ts`, `repeat.ts` | **Tinggi** (perubahan lintas compiler, controller, dan runtime; beberapa bagian sudah dikerjakan maintainer seperti PR `#2560`, `#2565`, `#2574`). | **Tinggi** jika mengikuti desain berbasis atribut/TC (`hydrate.on`, `au-skip-hydration`) dan DI (`IPendingTasks`), namun harus melalui diskusi RFC dulu agar tidak duplikasi dengan PR aktif upstream. |

---

## 8. Ringkasan Implikasi untuk Ekosistem Kita

1. **Sinkronisasi versi**: Kita berada di `2.0.0-rc.2`, sementara `master` upstream sudah memiliki perbaikan krusial pasca-`rc.2` (`#2561` untuk `hydrate()` melalui `start()`, `#2563` untuk *text node round-trip*, dan `#2556` untuk `LazyRoute` factories). Saat `rc.3` atau `2.0.0` rilis, `@aureliajs/ssr` dapat mengadopsi `prepareSSRForSerialization` / `restoreSSRTextNodes` bawaan.
2. **Kontribusi cepat paling aman**: Peringkat **1, 2, dan 3** di atas dapat menghilangkan 4 dari 6 *workaround* di `packages/aurelia-ssr/src/render.ts` (`SsrTemplateElementFactory`, Proxy `attributes`, polyfill `getPropertyPriority`, polyfill `adoptNode`) langsung di hulu dengan risiko regresi minimal.
3. **Batas tanggung jawab**: Fitur meta-framework seperti konvensi file-system routing, Hono adapter, island selective hydration triggers, dan `.aux` SFC tetap paling sehat dibangun di paket kita (`@hono/aurelia`, `@aureliajs/islands`, `@aureliajs/vite-plugin-aux`) atau diselaraskan dengan primitif rendah upstream (`ISSRContext`, `ISSRScope`, `ServerLocationManager`) setelah berdiskusi di issue `#2536`–`#2538`.
