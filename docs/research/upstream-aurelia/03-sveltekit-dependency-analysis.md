# 03 — Analisis Dependensi & Arsitektur SvelteKit 3.0 pada `harijadi`

Dokumen ini menganalisis penggunaan SvelteKit 3.0 (`@sveltejs/kit@^3.0.0`) beserta ekosistem build-nya pada proyek referensi `/home/dev/project/harijadi`, membedah mekanisme internalnya di `node_modules/@sveltejs/kit/src`, lalu mengevaluasi setiap inovasi terhadap identitas Aurelia 2 (**Dependency Injection**, **Convention-over-Configuration**, **Direct-DOM**, **Web Standards**, **Hono-first**) serta peta paket kita (`@aureliajs/ssr`, `@hono/aurelia`, `@aureliajs/vite-plugin-aux`, `@aureliajs/islands`, `@aureliajs/bridge`, `vscode-aux`, `ssr-playground`) dan **Aurelia Core** (`packages/upstream/aurelia`).

---

## 1. Profil Dependensi & Konfigurasi `harijadi`

Berdasarkan inspeksi langsung pada `/home/dev/project/harijadi`:

- **Stack & Versi** (`/home/dev/project/harijadi/package.json`):
  - Framework & compiler: `@sveltejs/kit` (`^3.0.0`), `svelte` (`^5.57.2`), `@sveltejs/vite-plugin-svelte` (`^7.2.0`), `vite` (`^8.3.0`, terukur `8.3.6` + Rolldown pada build log), `@sveltejs/adapter-vercel` (`^7.0.0`), `@sveltejs/enhanced-img` (`^1.0.0`), `@tailwindcss/vite` (`^4.3.0`), `svelte-check` (`^4.6.0`), `typescript` (`^6.0.3`).
  - Runtime dependencies: `better-auth` (`^1.6.24`), `drizzle-orm` (`^0.45.2`), `@libsql/client` (`^0.17.3`), `@libsql/isomorphic-ws` (`^0.1.5`), `ws` (`^8.18.0`), `@vercel/blob` (`^2.8.2`), `@vercel/analytics` (`^2.0.1`), `lucide-svelte` (`^1.0.1`).
  - Scripts penting: `build` menjalankan `vite build && (node scripts/fix-vercel-nft.js 2>/dev/null || bun scripts/fix-vercel-nft.js)`; `prepare` menjalankan `svelte-kit sync || echo ''`; `check` menjalankan `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`.
- **Absennya `svelte.config.*` & Konsolidasi ke `vite.config.ts`**:
  - Tidak ada file `svelte.config.js` atau `svelte.config.ts` di root `/home/dev/project/harijadi`.
  - Di SvelteKit 3.0, seluruh opsi framework (`compilerOptions`, `adapter`) dipindahkan langsung ke plugin `sveltekit({ ... })` di `/home/dev/project/harijadi/vite.config.ts` (L1-L23). Pada `@sveltejs/kit/src/core/config/options.js` (L153-L159), properti `kit:` lama bahkan secara eksplisit ditolak dengan error `config_kit_namespace`.
- **TypeScript & Path Aliases** (`/home/dev/project/harijadi/tsconfig.json`):
  - Mewarisi `$app/tsconfig` (`.svelte-kit/tsconfig.json` hasil `svelte-kit sync`) dengan `"types": ["$app/types", "node"]` dan subpath imports `#lib/*` via `package.json` `"imports"`.
- **App Shell & Metadata** (`/home/dev/project/harijadi/src/app.html`, `/home/dev/project/harijadi/src/app.d.ts`):
  - `src/app.html` menggunakan placeholder `%sveltekit.head%`, `%sveltekit.body%`, dan atribut `data-sveltekit-preload-data="hover"` pada `<body>`.
  - `src/app.d.ts` memperluas global `namespace App` (`Locals` dengan `user`, `session`, `accountMode`).

---

## 2. Analisis Mendalam Tiap Inovasi SvelteKit vs Ekosistem Aurelia

Setiap inovasi di bawah ini dinilai menggunakan tiga kategori verdict:
- **`offer boldly upstream`**: Layak diusulkan ke `aurelia/aurelia` karena menyentuh kapabilitas fundamental framework/router/compiler/SSR core.
- **`build in our packages`**: Lebih tepat dibangun di layer library/meta-tooling kita (`@aureliajs/ssr`, `@hono/aurelia`, `@aureliajs/vite-plugin-aux`, `@aureliajs/islands`, `@aureliajs/bridge`, `vscode-aux`, `ssr-playground`) tanpa membebani core Aurelia.
- **`reject (paradigm mismatch)`**: Bertentangan dengan filosofi Aurelia (Direct-DOM, Web Standards, DI eksplisit, atau terlalu terikat model compiler Svelte / platform tertentu).

---

### 2.1 File-Based Routing Tree: Route Groups, Dynamic Params, `+layout`/`+page`/`+server`, dan `.server` Split

- **Apa yang dilakukan**:
  SvelteKit memetakan struktur direktori `src/routes` menjadi route tree terstruktur oleh `create_manifest_data` (`/home/dev/project/harijadi/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js`).
  - **Route groups `(group)`** mempartisi layout dan guard otorisasi tanpa mengubah segmen URL (contoh di `harijadi`: `(public)`, `(auth)`, `(receptionist)/desk/[slug]`, `app/(workspace)`, `app/(console)/admin`, `app/(merchant)/seller`).
  - **Dynamic params `[slug]`, `[code]`, `[id]`** diparsing melalui `parse_route_id` (`create_manifest_data/index.js:190`) menjadi regex + daftar `params` yang diketik ketat.
  - **Konvensi file `+`**: `+layout.svelte` & `+layout.server.ts` untuk layout bertingkat, `+page.svelte` & `+page.server.ts` untuk halaman + loader/actions, `+error.svelte` untuk error boundary berjenjang, dan `+server.ts` untuk pure HTTP API endpoint (`src/routes/api/payments/webhook/+server.ts`, `src/routes/api/upload/+server.ts`, `src/routes/api/payments/snap/+server.ts`, `src/routes/api/account/switch-mode/+server.ts`).
  - **Server-Side Route Resolution (SvelteKit 3)**: Selain client route manifest, SvelteKit 3 mendukung `server_routing.js` (`/home/dev/project/harijadi/node_modules/@sveltejs/kit/src/runtime/server/page/server_routing.js`) untuk meresolusi rute di server (`resolve_route` & `resolve_route_by_id` via `/_app/routes/<id>/__route.js`) sehingga manifest rute besar tidak perlu dikirim penuh ke browser saat navigasi awal.
- **Bukti File**:
  - Route groups & tree `harijadi`: `/home/dev/project/harijadi/src/routes/(public)/+layout.server.ts`, `/home/dev/project/harijadi/src/routes/(auth)/login/+page.server.ts`, `/home/dev/project/harijadi/src/routes/(receptionist)/desk/[slug]/+page.server.ts`, `/home/dev/project/harijadi/src/routes/app/(console)/admin/+layout.server.ts`, `/home/dev/project/harijadi/src/routes/u/[slug]/[code]/+page.server.ts`, `/home/dev/project/harijadi/src/routes/api/payments/webhook/+server.ts`, `/home/dev/project/harijadi/src/routes/api/upload/+server.ts`.
  - Internals: `@sveltejs/kit/src/core/sync/create_manifest_data/index.js`, `@sveltejs/kit/src/runtime/server/page/server_routing.js`, `@sveltejs/kit/src/runtime/server/endpoint.js`.
- **Pemetaan Paket**:
  - `@hono/aurelia` (saat ini routing eksplisit via `app.get('/', aurelia(HomePage))` di `packages/hono-aurelia/src/adapter.ts`; `packages/hono-aurelia/src/builder.ts` baru melakukan auto-discovery `src/pages` untuk client hydration bundle).
  - `@aureliajs/vite-plugin-aux` (mendukung blok `<script server>` pada `.aux` SFC sebagaimana terlihat pada `AuxDescriptor.serverScript` di `packages/vite-plugin-aux/src/types.ts:27` dan `AureliaRouteComponent` di `packages/hono-aurelia/src/types.ts:57`).
  - **Aurelia Core** (`@aurelia/router` / `@aurelia/router-lite` sudah punya konvensi deklaratif `static routes`, `@route`, dan lifecycle `loading`/`canLoad` berbasis class & DI).
- **Relevansi**: **Sedang–Tinggi** (konsep `.server` split dan route-level co-located loader/action sangat relevan, tetapi konvensi folder `+page`/`(group)` terlalu memaksakan struktur direktori tunggal).
- **Keselarasan Identitas Aurelia**:
  Aurelia berakar pada **Hono-first routing** (explicit Web Standard Hono router di server) dan **class-based CoC / decorator `@route`** di client — bukan file-system router wajib. Memaksakan `+page.svelte`/`+layout.server.ts` di Aurelia Core bertentangan dengan fleksibilitas Hono dan router Aurelia yang agnostic terhadap struktur folder. Namun, **pemisahan `.server` / `<script server>`** dan **route-group middleware scoping** sangat cocok diterapkan secara opsional di `@hono/aurelia` (`app.route(...)` + `aureliaDefaults()`).
- **Verdict**:
  - **File-system `+page`/`(group)` convention wajib**: **`reject (paradigm mismatch)`** untuk Aurelia Core; tetap gunakan Hono router + `@aurelia/router` (bisa dibuat opt-in directory scanner di `@hono/aurelia` bila dibutuhkan, bukan konvensi wajib).
  - **Co-located `.server` split (`<script server>` / `loader` + `actions` pada komponen)**: **`build in our packages`** (`@aureliajs/vite-plugin-aux` + `@hono/aurelia`).

---

### 2.2 `hooks.server.ts` & Middleware Pipeline (`Handle`, `locals`, `sequence`)

- **Apa yang dilakukan**:
  `src/hooks.server.ts` menyediakan satu interception pipeline (`handle: Handle`) untuk seluruh request masuk sebelum route matching/rendering. Di `harijadi`, `src/hooks.server.ts` (L1-L171) memadukan:
  1. Polyfill `globalThis.require` via `createRequire(import.meta.url)` (L1-L6) karena dependency CJS/Node tertentu.
  2. Guard asset & upload bypass (`/uploads/`).
  3. Cookie re-assembly & session lookup via `better-auth` (`auth.api.getSession`), menyimpan hasilnya di `event.locals.user` & `event.locals.session`.
  4. **Lapis 1 Route-Group Authorization (`ROUTE_ACCESS_RULES`)** berdasarkan `extractRouteGroup(pathname)` — me-redirect `GET` ke `/login` atau `/app` dan mengembalikan JSON action failure 401/403 untuk `POST`.
  5. Tracking UTM & referral cookie saat `!building` (`$app/env`).
  6. Delegasi ke `svelteKitHandler({ event, resolve, auth, building })` dari `better-auth/svelte-kit`.
  Di internal SvelteKit (`@sveltejs/kit/src/runtime/server/respond.js`), `handle` membungkus `resolve(event, { transformPageChunk, filterSerializedResponseHeaders, preload })` dan mengikat `RequestEvent` ke `AsyncLocalStorage` (`with_request_store` di `respond.js` & `getRequestEvent()` di `$app/server`).
- **Bukti File**:
  - `/home/dev/project/harijadi/src/hooks.server.ts` (L1-L171).
  - `/home/dev/project/harijadi/node_modules/@sveltejs/kit/src/runtime/server/respond.js` (L51-L58, `with_request_store` di `internal_respond`), `@sveltejs/kit/src/exports/hooks/sequence.js`.
- **Pemetaan Paket**:
  - `@hono/aurelia`: Hono **sudah** memiliki middleware model berbasis Web Standard (`MiddlewareHandler`, `app.use(...)`, `c.set`/`c.get`, dan `aureliaDefaults()` yang menggunakan `WeakMap<Request, AureliaDefaultsOptions>` di `packages/hono-aurelia/src/adapter.ts:37`).
  - `@aureliajs/ssr`: `IRequestContext` DI token (`packages/aurelia-ssr/src/tokens.ts` & `packages/aurelia-ssr/src/render.ts`) sudah meneruskan konteks per-request langsung ke DI container Aurelia tanpa `AsyncLocalStorage` global magic.
- **Relevansi**: **Tinggi** (sebagai pola arsitektur), tetapi **sudah terlampaui lebih bersih oleh Hono**.
- **Keselarasan Identitas Aurelia**:
  Sangat selaras di level konsep (per-request middleware + context propagation), tetapi implementasi `hooks.server.ts` ala SvelteKit tidak diperlukan karena Hono adalah middleware framework Web-Standards kelas satu. Bahkan `ROUTE_ACCESS_RULES` di `harijadi` yang terpaksa melakukan regex manual `extractRouteGroup(pathname)` di satu `hooks.server.ts` monolitik menunjukkan keterbatasan SvelteKit dibanding Hono `app.use('/app/admin/*', adminGuard)` yang modular.
- **Verdict**: **`reject (paradigm mismatch)`** (untuk mekanisme `hooks.server.ts` / `getRequestEvent` berbasis `AsyncLocalStorage` tersendiri) — pertahankan **Hono middleware + `WeakMap<Request>` + `IRequestContext` DI** di `@hono/aurelia` & `@aureliajs/ssr`.

---

### 2.3 Remote Functions (`*.remote.ts`: `query`, `query.live`, `form`, `command`, `prerender`)

- **Apa yang dilakukan**:
  Inovasi paling menonjol di SvelteKit 3.0 adalah RPC type-safe melalui file `*.remote.ts` (diaktifkan lewat `experimental.remoteFunctions: true` di `options.js:108`).
  - **Build-time transform** (`@sveltejs/kit/src/exports/vite/plugins/remote.js`):
    - Pada environment **server** (`L110-L156`): mem-wrap ekspor modul dengan `init_remote_functions`, memberi ID hash `<hash>/<name>`, dan meng-emit chunk terpisah `\0sveltekit-remote:${remote.hash}` (`chunks/remote-<hash>.js`).
    - Pada environment **client** (`L158-L209`): **mengganti seluruh isi modul server** dengan stub RPC yang memanggil `runtime/client/remote-functions/index.js` (`__remote.query(...)`, `__remote.form(...)`, `__remote.command(...)`, `__remote.query_live(...)`).
  - **Server runtime** (`@sveltejs/kit/src/runtime/server/remote-functions.js`):
    - Menangani request `/_app/remote/<hash>/<name>` dengan CSRF origin check ketat (`is_remote_forbidden` di `csrf.js:63-65`, menolak semua non-GET lintas-origin tanpa `trusted_origins`).
    - Mendukung **`query.live`** (`L52-L141`) yang mengembalikan `text/event-stream` (SSE) dari `AsyncGenerator`, lengkap dengan heartbeat `: keep-alive`, diffing payload via `stringify`, dan cooperative cancellation via `event.request.signal`.
  - **Catatan pada `harijadi`**: Dari pencarian di `/home/dev/project/harijadi/src`, **tidak ditemukan satupun file `*.remote.ts`**, dan `experimental.remoteFunctions` tidak diaktifkan di `vite.config.ts`. Namun build log tetap memunculkan `remote-entry.js` karena `@sveltejs/kit/src/exports/vite/build/index.js:137` secara statis mendaftarkan `['remote-entry']: '${runtime_directory}/app/server/remote/index.js'` sebagai input build server!
- **Bukti File**:
  - `@sveltejs/kit/src/exports/vite/plugins/remote.js` (L1-L237), `@sveltejs/kit/src/runtime/server/remote-functions.js` (L1-L200+), `@sveltejs/kit/src/runtime/client/remote-functions/` (`query`, `query-live`, `form.svelte.js`, `command.svelte.js`), `@sveltejs/kit/src/exports/vite/build/index.js:137`, `@sveltejs/kit/src/core/config/options.js:108`.
- **Pemetaan Paket**:
  - `@hono/aurelia` (`aureliaAction()`, `dataEndpoint`, atau RPC Hono `hc`!).
  - `@aureliajs/vite-plugin-aux` (jika ingin transformasi compile-time seperti `<script server>` atau `.server.ts` proxy).
- **Relevansi**: **Sedang–Tinggi** (ide RPC client-server yang mulus sangat menarik, khususnya `query.live` via SSE yang sejalan dengan Web Standards `ReadableStream` + `EventSource`).
- **Keselarasan Identitas Aurelia**:
  - **Auto-stubbing file `*.remote.ts` oleh bundler** kurang selaras dengan prinsip Aurelia yang menghindari magic compiler yang menyembunyikan batas HTTP/network — apalagi ekosistem Hono sudah punya **Hono RPC (`hc<AppType>`)** yang 100% eksplisit, zero-magic, dan end-to-end type-safe!
  - Namun konsep **`query.live` berbasis SSE (`ReadableStream` / `AsyncGenerator`)** dan **`command` / `form` RPC helper** sangat Web-Standards dan bisa menjadi add-on ringan di `@hono/aurelia` (mis. `aureliaStream()` / `hc` integration) tanpa bundler AST magic.
- **Verdict**:
  - **Compiler-transformed `*.remote.ts` stubbing**: **`reject (paradigm mismatch)`** — gunakan **Hono RPC (`hc`)** yang eksplisit dan tanpa magic bundler.
  - **SSE `AsyncGenerator` live helper + typed client form/command fetcher**: **`build in our packages`** (`@hono/aurelia` / `@aureliajs/ssr`).

---

### 2.4 Form Actions & `use:enhance` (Progressive Enhancement)

- **Apa yang dilakukan**:
  Di SvelteKit, mutasi halaman didefinisikan di `+page.server.ts` sebagai `export const actions = { ... }` (contoh di `harijadi`: `src/routes/(auth)/login/+page.server.ts`, `src/routes/(receptionist)/desk/[slug]/+page.server.ts`, `src/lib/server/eventActions/desk.ts`).
  - **Server** (`@sveltejs/kit/src/runtime/server/page/actions.js`): Membedakan form submit biasa (HTML) vs AJAX JSON (`is_action_json_request` via header `Accept: application/json`, L16-L23), lalu menserialisasikan `ActionResult` (`success`, `failure`, `redirect`, `error`) dengan `devalue`.
  - **Client** (`@sveltejs/kit/src/runtime/app/forms/index.js` & `runtime/app/forms/shared.js`): Directive `use:enhance` mencegat event `submit` pada `<form method="post">` tanpa full-page reload, memanggil callback `submit({ formData, action, cancel, controller })`, dan secara default me-reset form, menjalankan `refreshAll()`, serta memanggil `applyAction(result)`.
  - **Pola nyata di `harijadi`**: Di `/home/dev/project/harijadi/src/lib/components/desk/DeskModals.svelte` (L197-L255), `use:enhance` digunakan untuk **offline interception** (`if (isOffline) { cancel(); enqueueCheckIn(...); }`) dan **optimistic UI** setelah `await update()`.
- **Bukti File**:
  - `/home/dev/project/harijadi/src/routes/(auth)/login/+page.server.ts` (L53-L200+), `/home/dev/project/harijadi/src/routes/(receptionist)/desk/[slug]/+page.server.ts` (L12-L15), `/home/dev/project/harijadi/src/lib/components/desk/DeskModals.svelte` (L197-L255).
  - `@sveltejs/kit/src/runtime/server/page/actions.js` (L15-L160), `@sveltejs/kit/src/runtime/app/forms/index.js` (L1-L130+).
- **Pemetaan Paket**:
  - `@hono/aurelia`: Sudah memiliki `aureliaAction()` (`packages/hono-aurelia/src/adapter.ts:384+` & `packages/hono-aurelia/src/types.ts:36-50`) dengan dispatch via query `_action`, header `X-Action`, atau `'default'`.
  - `@aureliajs/bridge` (sudah punya `au-htmx` di `packages/aurelia-bridge/src/au-htmx.ts`) atau Custom Attribute baru **`au-enhance`** di `@hono/aurelia/client` / `@aureliajs/ssr/client`.
- **Relevansi**: **Sangat Tinggi**. Progressive enhancement pada `<form method="POST">` adalah standar Web (HTML forms bekerja tanpa JS, ditingkatkan saat JS aktif) dan merupakan bagian yang masih kurang di sisi client `@hono/aurelia` saat ini!
- **Keselarasan Identitas Aurelia**:
  **Sangat selaras (100%)**. Aurelia dibangun di atas Custom Attributes (`au-enhance` sebagai padanan langsung `use:enhance`) dan HTML5 `<form>` + `FormData` + `fetch` standar Web. Tidak perlu compiler magic apa pun — cukup Custom Attribute Aurelia 2 murni yang langsung berbicara dengan `aureliaAction()` di `@hono/aurelia`.
- **Verdict**: **`build in our packages`** — bangun Custom Attribute `au-enhance` di `@hono/aurelia/client` (dan dukung content-negotiated JSON action response di `aureliaAction()`).

---

### 2.5 `load`, Dependency Tracking, `invalidate` / `invalidateAll` / `refreshAll`

- **Apa yang dilakukan**:
  - Server/universal `load` functions di `+layout.server.ts` & `+page.server.ts` menerima `event` yang dibungkus **Proxy pelacak dependensi** (`@sveltejs/kit/src/runtime/server/page/load_data.js`, L44-L130): setiap akses `url.pathname`, `url.searchParams`, `params`, `parent()`, atau `depends('app:guests')` dicatat ke `uses` (`dependencies`, `params`, `parent`, `route`, `url`, `search_params`).
  - Saat navigasi client-side atau setelah mutasi, SvelteKit hanya meminta node yang dependensinya berubah ke endpoint `/__data.json?x-sveltekit-invalidated=010` (`respond.js:146-155`).
  - Di client, `invalidate(key)` dan `invalidateAll()` (`@sveltejs/kit/src/runtime/client/client.js:2691-2726`) memicu rerun selektif loader aktif. Di `harijadi`, `src/routes/(receptionist)/desk/[slug]/+page.svelte` (L28 & L266) memanggil `invalidateAll()` saat sinkronisasi antrean offline selesai.
- **Bukti File**:
  - `/home/dev/project/harijadi/src/routes/+layout.server.ts`, `/home/dev/project/harijadi/src/routes/app/(workspace)/+layout.server.ts`, `/home/dev/project/harijadi/src/routes/(receptionist)/desk/[slug]/+page.svelte` (L28, L266).
  - `@sveltejs/kit/src/runtime/server/page/load_data.js` (L22-L160), `@sveltejs/kit/src/runtime/client/client.js` (L2691-L2740), `@sveltejs/kit/src/runtime/server/respond.js` (L146-L155).
- **Pemetaan Paket**:
  - `@hono/aurelia`: Sudah memiliki `loader` per route dan `dataEndpoint: true` (`Accept: application/json` di `packages/hono-aurelia/src/types.ts:94`).
  - **Aurelia Core** (`@aurelia/router` / `@aurelia/router-lite`): Lifecycle `loading(params, next, current)` sudah menangani data loading saat navigasi client, tetapi belum memiliki mekanisme built-in `depends()` / granular `invalidate(urlOrKey)` untuk re-fetch server data saat SPA navigation.
- **Relevansi**: **Tinggi**.
- **Keselarasan Identitas Aurelia**:
  - Proxy tracking otomatis ala SvelteKit bisa terasa terlalu implisit, tetapi **kombinasi explicit dependency keys + `dataEndpoint` JSON revalidation** di `@hono/aurelia/client` + integrasi hook `loading()` di `@aurelia/router` sangat selaras dengan HTTP caching (ETag/Vary) dan DI Aurelia.
- **Verdict**:
  - **Client router `invalidate` / re-run `loading` hook**: **`offer boldly upstream`** (sebagai proposal ringan pada `@aurelia/router` / `@aurelia/router-lite` untuk me-reload route lifecycle aktif secara deklaratif).
  - **Granular `/__data` JSON hydration reloader (`dataEndpoint` client fetcher)**: **`build in our packages`** (`@hono/aurelia`).

---

### 2.6 Client Navigation: Preloading (`data-sveltekit-preload-data`), Version Check, dan `snapshot`

- **Apa yang dilakukan**:
  - **Link Preloading**: Di `src/app.html` (L28), `data-sveltekit-preload-data="hover"` memicu `preload()` di `runtime/client/client.js` (L2418, serta `preloadData` L2743 & `preloadCode` L2803) saat user hover/tap tautan untuk mengunduh chunk JS + data JSON sebelum klik.
  - **App Version Detection (`_app/version.json` & `x-sveltekit-version`)**: Setiap response HTML/action menyertakan versi build; jika client mendeteksi versi baru saat navigasi, SvelteKit otomatis fallback ke full-page reload agar tidak terjadi mismatch chunk.
  - **Form/UI State `snapshot`** (`@sveltejs/kit/src/runtime/client/snapshots.js`, L1-L115): Hook `snapshot({ capture, restore, reset })` menyimpan state UI (misalnya input form yang belum disubmit atau posisi tab) ke `sessionStorage` per history index (`NAVIGATION_SNAPSHOT_KEY`), lalu memulihkannya saat user menekan tombol Back/Forward browser.
- **Bukti File**:
  - `/home/dev/project/harijadi/src/app.html` (L28).
  - `@sveltejs/kit/src/runtime/client/client.js` (L2418-L2815), `@sveltejs/kit/src/runtime/client/snapshots.js` (L1-L115).
- **Pemetaan Paket**:
  - `@hono/aurelia` & `@aureliajs/islands` (khususnya `data-au-preload` atau `island="interaction"` / idle prefetching).
  - **Aurelia Core** (`@aurelia/router` / `@aurelia/router-lite` untuk `viewport`/hover prefetch dan history state restoration).
- **Relevansi**: **Tinggi**. Preload saat hover dan history snapshot UX secara dramatis meningkatkan persepsi kecepatan aplikasi SSR+SPA.
- **Keselarasan Identitas Aurelia**:
  **Sangat selaras**. Atribut HTML standar (`data-au-preload="hover|tap"`) + `sessionStorage` + History API adalah murni Web Standards tanpa ketergantungan pada Svelte runes.
- **Verdict**:
  - **Router link preloading & history state snapshot lifecycle**: **`offer boldly upstream`** ke `@aurelia/router` (atau mulai sebagai PoC di `@hono/aurelia` / `@aureliajs/islands` jika upstream fokus stabilisasi v2 GA terlebih dahulu).

---

### 2.7 Serialization via `devalue` & Streaming Promises / XSS Escaping

- **Apa yang dilakukan**:
  - SvelteKit memakai **`devalue`** (`devalue.uneval` dan `devalue.stringify` / `parse`) di `render.js` (L3, L412, L473, L480, L500, L503) dan `remote-functions.js` (L11, L109) sehingga `Date`, `Map`, `Set`, `BigInt`, `RegExp`, `undefined`, referensi siklik, dan bahkan **unawaited Promises** (streaming SSR) dapat dikirim dari server ke client.
  - Untuk payload `<script type="application/json" data-sveltekit-fetched>` dari `event.fetch()`, `serialize_data.js` (L22-L68) melakukan escaping `<` -> `\u003C`, `\u2028`, `\u2029` sesuai HTML spec.
- **Bukti File**:
  - `@sveltejs/kit/src/runtime/server/page/render.js` (L3, L412-L515), `@sveltejs/kit/src/runtime/server/page/serialize_data.js` (L22-L75), `@sveltejs/kit/src/runtime/server/page/data_serializer.js`.
- **Pemetaan Paket**:
  - `@aureliajs/ssr`: Saat ini `packages/aurelia-ssr/src/serialize.ts` memakai custom `sanitizeValue` JSON murni (mengubah `Date` menjadi ISO string, `bigint` menjadi string, circular menjadi `'[Circular]'`), dan `packages/aurelia-ssr/src/html.ts` membungkusnya ke `<script type="application/json" id="__AURELIA_SSR_DATA__">`.
- **Relevansi**: **Tinggi**.
- **Keselarasan Identitas Aurelia**:
  - `devalue.uneval()` mengeksekusi JS literal inline di HTML (`<script>__sveltekit_xxx.data = ...</script>`), yang **kurang ramah CSP strict** dibanding HTML5 inert `<script type="application/json">` milik `@aureliajs/ssr`!
  - Namun `devalue.stringify()` / `devalue.parse()` menghasilkan **JSON murni** (aman untuk `<script type="application/json">` dan strict CSP!), sekaligus mempertahankan tipe `Date`, `Map`, `Set`, `BigInt`, `undefined`, dan circular references dengan tepat (tidak rusak menjadi string biasa seperti `JSON.stringify`).
  - Streaming deferred promises via Web Streams + `<script type="application/json">` sangat cocok dipadukan dengan streaming SSR di `@hono/aurelia/src/adapter.ts:286-328`.
- **Verdict**:
  - **`devalue.uneval` inline JS execution**: **`reject (paradigm mismatch)`** (karena melanggar prinsip HTML5 inert `<script type="application/json">` + strict CSP di `@aureliajs/ssr`).
  - **`devalue.stringify`/`parse` (JSON mode) & deferred stream chunks**: **`build in our packages`** (`@aureliajs/ssr/src/serialize.ts` + `@hono/aurelia`).

---

### 2.8 Explicit Environment Schema (`src/env.ts`, `defineEnvVars`, `$env/*`)

- **Apa yang dilakukan**:
  Di SvelteKit 3.0 (`harijadi/src/env.ts`), developer mendeklarasikan env vars secara eksplisit memakai `defineEnvVars` dari `@sveltejs/kit/env` lengkap dengan deskripsi dan fungsi schema validator (mendukung Standard Schema maupun custom validator seperti `validateAuthSecret(value)` di `harijadi/src/env.ts:22`).
  - `core/env.js` (`load_explicit_env`) memvalidasi env saat dev/build dan menghasilkan modul virtual `$app/env/private` & `$app/env/public` serta `env.d.ts` (`core/sync/write_env.js`).
  - `runtime/server/env_module.js` menyajikan `/_app/env.js` untuk dynamic public env di runtime lengkap dengan header `ETag` dan HTTP `304 Not Modified`.
- **Bukti File**:
  - `/home/dev/project/harijadi/src/env.ts` (L1-L44).
  - `@sveltejs/kit/src/core/env.js` (L25-L180), `@sveltejs/kit/src/core/sync/write_env.js` (L1-L39), `@sveltejs/kit/src/exports/vite/plugins/env-vars.js` (L1-L141), `@sveltejs/kit/src/runtime/server/env_module.js` (L1-L32).
- **Pemetaan Paket**:
  - `@hono/aurelia` / `@aureliajs/vite-plugin-aux`: Di Edge/Workers/Node/Bun, isolasi `public` vs `private` env adalah kebutuhan nyata agar secret (`MIDTRANS_SERVER_KEY`, `BETTER_AUTH_SECRET`) tidak pernah bocor ke bundle client.
- **Relevansi**: **Tinggi** (khususnya aspek *schema validation at startup/build* dan *public/private split*).
- **Keselarasan Identitas Aurelia**:
  Selaras jika menggunakan Standard Schema / DI configuration object (mis. `IEnvConfig` di Aurelia DI container + Vite virtual env guard), tanpa memerlukan magic virtual module yang terlalu kompleks. Pada Hono, `c.env` (Cloudflare Workers bindings) berbeda dari `process.env`, sehingga abstraksi env DI harus kompatibel dengan `c.env` Hono.
- **Verdict**: **`build in our packages`** (`@hono/aurelia` & `@aureliajs/vite-plugin-aux` sebagai helper opsional `defineEnv` + guard public/private yang mendukung `c.env` dan `process.env`).

---

### 2.9 Codegen `$types` via `svelte-kit sync`

- **Apa yang dilakukan**:
  Menjalankan `svelte-kit sync` (`@sveltejs/kit/src/core/sync/sync.js`) menghasilkan folder `.svelte-kit/types/` berisi `$types.d.ts` di setiap direktori rute (`write_types/index.js`) serta `node_modules/$app/types/index.d.ts` (`write_app_types.js`). Berkas ini menginjeksi `PageServerLoad`, `LayoutServerLoad`, `PageProps`, `LayoutProps`, `Actions`, `RequestHandler` yang otomatis terhubung ke parameter rute (`RouteParams`), data parent layout (`LayoutData`), dan return type loader tanpa developer menulis anotasi tipe manual antar file.
- **Bukti File**:
  - `/home/dev/project/harijadi/package.json` (`"prepare": "svelte-kit sync || echo ''"`), `/home/dev/project/harijadi/tsconfig.json` (`"extends": "$app/tsconfig"`), penggunaan `import type { PageServerLoad } from './$types'` di seluruh `+page.server.ts` & `+layout.server.ts` `harijadi`.
  - `@sveltejs/kit/src/core/sync/sync.js` (L24-L109), `@sveltejs/kit/src/core/sync/write_types/index.js` (L35-L342), `@sveltejs/kit/src/core/sync/write_app_types.js` (L107-L320).
- **Pemetaan Paket**:
  - `@aureliajs/vite-plugin-aux` & `vscode-aux`: Saat ini `vscode-aux/src/analyzer.ts` menganalisis `<script>` dan `<template>` dalam satu file `.aux` menggunakan TypeScript Compiler API, dan belum menghasilkan `.d.ts` antar file atau type bridging untuk `<script server>` -> komponen client!
- **Relevansi**: **Tinggi** (untuk DX `.aux` SFC dan `vscode-aux`).
- **Keselarasan Identitas Aurelia**:
  - **Aurelia Core** bekerja dengan TypeScript class & DI murni — developer mengimpor tipe langsung tanpa perlu kode tergenerate tersembunyi di `node_modules/$app`.
  - Namun untuk **`.aux` Single File Components** (`<script server>` + `<script>` + `<template>`), inferensi tipe dari `loader()` di `<script server>` ke view-model client dan template diagnostics di `vscode-aux` / `vite-plugin-aux` sangat meningkatkan DX tanpa merusak kesederhanaan TypeScript standar.
- **Verdict**:
  - **Generated `./$types` global route-tree codegen**: **`reject (paradigm mismatch)`** untuk Aurelia Core (karena TypeScript + DI Aurelia + Hono RPC sudah type-safe secara native tanpa shadow directory `.svelte-kit/types`).
  - **`.aux` SFC virtual `.d.ts` / server-to-client prop type inference**: **`build in our packages`** (`@aureliajs/vite-plugin-aux` + `vscode-aux`).

---

### 2.10 Server-Only Import Guard (`vite-plugin-sveltekit-guard`)

- **Apa yang dilakukan**:
  Plugin `vite-plugin-sveltekit-guard` (`@sveltejs/kit/src/exports/vite/plugins/guard.js`) mencegah file client bundle mengimpor modul server-only (`*.server.*`, `*/server/*`, `$app/server`, `$app/env/private`, `*.remote.*`). Agar pesan errornya menampilkan rantai import lengkap (*import pyramid*), plugin ini memasang hook `resolveId` (`enforce: 'pre'`) yang aktif pada seluruh client build (`guard.js:73-100`) dan memanggil `await this.resolve(...)` untuk mencatat semua edge ke `import_map`.
- **Bukti File**:
  - `@sveltejs/kit/src/exports/vite/plugins/guard.js` (L29-L205).
  - Build log `harijadi`: `vite-plugin-sveltekit-guard` mencatat **15.958 panggilan `resolveId`**.
- **Pemetaan Paket**:
  - `@aureliajs/vite-plugin-aux` (dan `packages/aurelia-ssr` / `packages/aurelia-islands` yang sudah menjaga isolasi subpath `./client` vs `./server` melalui `packages/README.md:112`).
- **Relevansi**: **Tinggi** (proteksi agar secret/DB driver server tidak bocor ke bundle browser sangat penting!).
- **Keselarasan Identitas Aurelia**:
  Konsep guard batas server/client **100% selaras**, tetapi implementasi `resolveId` global pada **15.958 modul** adalah desain yang boros. Pada Rollup/Rolldown/Vite, rantai importer (`this.getModuleInfo(id).importers`) sudah tersedia **on-demand** saat modul terlarang benar-benar di-`load()` — kita **tidak perlu** mencegat 15.958 `resolveId` secara eager!
- **Verdict**: **`build in our packages`** — implementasikan guard server-only ringan di `@aureliajs/vite-plugin-aux` (dan/atau validator subpath di `@hono/aurelia` builder) yang hanya mengecek pola target (`*.server.*`, `/server/`, `node:*`, `jsdom`, `linkedom`) atau menelusuri `getModuleInfo` secara lazy saat pelanggaran terdeteksi.

---

### 2.11 CSRF Origin Protection (`csrf.js`)

- **Apa yang dilakukan**:
  Pada setiap request non-dev di `@sveltejs/kit/src/runtime/server/respond.js` (L100-L129), SvelteKit menjalankan `is_csrf_forbidden` (`csrf.js:37-44`) untuk method mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) dengan `content-type` form (atau kosong) apabila header `Origin` tidak cocok dengan `self_origin` maupun `trustedOrigins`; sedangkan `is_remote_forbidden` (`csrf.js:63-65`) menolak semua non-GET lintas-origin ke endpoint remote function.
- **Bukti File**:
  - `@sveltejs/kit/src/runtime/server/csrf.js` (L19-L65), `@sveltejs/kit/src/runtime/server/respond.js` (L100-L129).
- **Pemetaan Paket**:
  - `@hono/aurelia` (khususnya pada `aureliaAction()` di `packages/hono-aurelia/src/adapter.ts` dan middleware CSRF).
- **Relevansi**: **Tinggi**. `aureliaAction()` di `@hono/aurelia` menerima `POST` form actions secara langsung; tanpa validasi `Origin` / `Sec-Fetch-Site` default atau kompatibilitas dengan `hono/csrf`, aplikasi fullstack rawan CSRF.
- **Keselarasan Identitas Aurelia**:
  Murni **Web Standards** (`Request.headers.get('origin')`, `URL.origin`, standar `Sec-Fetch-Site`, serta middleware `csrf()` bawaan Hono).
- **Verdict**: **`build in our packages`** — dokumentasikan/integrasikan middleware `hono/csrf` dan tambahkan pengecekan `Origin` default (yang bisa dikonfigurasi/opt-out) di `aureliaAction()` pada `@hono/aurelia`.

---

### 2.12 Deployment Adapter API & `@sveltejs/adapter-vercel` + `@vercel/nft`

- **Apa yang dilakukan**:
  `@sveltejs/kit/src/exports/adapter.js` dan `@sveltejs/adapter-vercel/index.js` mengompilasi output server menjadi Vercel Build Output API v3 (`.vercel/output/functions/![-]/catchall.func` + symlink per rute & `/_app/remote.func` di `adapter-vercel/index.js:180-298`). Untuk membundel `node_modules` serverless function, adapter memanggil `nodeFileTrace` dari `@vercel/nft` (`adapter-vercel/index.js:494-530`).
- **Bukti File**:
  - `@sveltejs/adapter-vercel/index.js` (L12-L540), `@sveltejs/kit/src/exports/adapter.js` (L1-L22).
  - `/home/dev/project/harijadi/scripts/fix-vercel-nft.js` (L1-L60) dan `/home/dev/project/harijadi/package.json` script `build`.
- **Pemetaan Paket**:
  - `@hono/aurelia` (`packages/hono-aurelia/src/builder.ts` — sudah memiliki `buildWorker` untuk Cloudflare Workers/Edge dengan Bun bundler + JSDOM stubbing!).
- **Relevansi**: **Sedang** (di Hono, ekosistem adapter sudah disediakan langsung oleh `hono/vercel`, `hono/cloudflare-workers`, `hono/bun`, `hono/node-server`).
- **Keselarasan Identitas Aurelia**:
  Prinsip **Hono-first & Web Standards** berarti server app Aurelia dijalankan sebagai **standard Hono `app.fetch` handler**. Memelihara adapter tree yang men-trace `node_modules` lewat `@vercel/nft` (seperti SvelteKit) justru rapuh karena dynamic `import()` dan optional native bindings. Pendekatan bundling modern (`Bun.build` / `Rolldown` / `esbuild` single-file bundle atau standard Hono adapter) jauh lebih bersih.
- **Verdict**: **`reject (paradigm mismatch)`** untuk meniru sistem adapter + NFT tracing milik SvelteKit; tetap gunakan **Hono native adapters** + single-bundle builder di `@hono/aurelia/build`.

---

### 2.13 Offline Queue (`checkInQueue.ts`), PWA Manifest, & Service Worker

- **Apa yang dilakukan**:
  - `harijadi` memiliki PWA manifest (`/home/dev/project/harijadi/static/manifest.json`) dan **offline-first outbox queue** di `/home/dev/project/harijadi/src/lib/offline/checkInQueue.ts` berbasis IndexedDB (`harijadi_offline_desk`) dengan fallback `localStorage`, yang diorkestrasi langsung dari callback `use:enhance` di `DeskModals.svelte` saat `!navigator.onLine`, lalu disinkronkan ulang saat koneksi kembali (memanggil `invalidateAll()` di `desk/[slug]/+page.svelte:266`).
  - Menariknya, `harijadi` **belum memiliki `src/service-worker.ts`** (tidak ditemukan file service worker di `src/` atau `static/`), meskipun SvelteKit sendiri menyediakan pipeline build service worker + `$app/service-worker` + `plugin_service_worker_env_vars` (`exports/vite/plugins/env-vars.js:102-141` dan `exports/vite/build/service-worker.js`).
- **Bukti File**:
  - `/home/dev/project/harijadi/src/lib/offline/checkInQueue.ts` (L1-L150+), `/home/dev/project/harijadi/src/lib/components/desk/DeskModals.svelte` (L204-L233), `/home/dev/project/harijadi/static/manifest.json`.
  - `@sveltejs/kit/src/exports/vite/build/service-worker.js`, `@sveltejs/kit/src/exports/vite/plugins/env-vars.js:102-141`.
- **Pemetaan Paket**:
  - `@hono/aurelia` (offline mutation interceptor untuk `au-enhance` adalah pola app-level yang sangat bagus, sementara SW entry bisa didukung opsional di `builder.ts` / `@aureliajs/vite-plugin-aux`).
- **Relevansi**: **Rendah–Sedang** (IndexedDB outbox queue seperti `checkInQueue.ts` adalah domain/application pattern, bukan tanggung jawab core framework, sesuai aturan zero app leakage di `packages/README.md:110`).
- **Keselarasan Identitas Aurelia**:
  Service Worker & IndexedDB adalah murni Web Standards, tetapi menyematkan offline outbox ke core library melanggar pemisahan concern. Cukup pastikan `au-enhance` di `@hono/aurelia/client` menyediakan hook `onBeforeSubmit` / `cancel()` seperti `use:enhance` agar pola offline outbox milik aplikasi dapat dipasang secara ergonomis.
- **Verdict**: **`reject (paradigm mismatch)`** untuk memasukkannya sebagai fitur outbox bawaan framework; cukup ekspos hook `cancel()` pada `au-enhance` di `@hono/aurelia/client` (**`build in our packages`**).

---

### 2.14 Apa yang Kurang di `harijadi` / SvelteKit, tetapi Kita Sudah Unggul? (Islands & Multi-Framework Bridge)

Dalam `harijadi`, setiap halaman interaktif maupun halaman publik (`(public)/+page.svelte`, `(public)/themes/+page.svelte`, `u/[slug]/[code]/+page.svelte` undangan publik) tetap harus memuat SvelteKit client runtime (`entry/start` + `entry/app` + `nodes/N.js`) bila CSR tidak dimatikan total secara biner per halaman (`export const csr = false`). SvelteKit tidak memiliki **selective/partial island hydration** (`visible`, `idle`, `interaction`, `media`) seperti `@aureliajs/islands` (`packages/aurelia-islands/src/server.ts`, loader ~1.3 kB) maupun `<au-bridge>` untuk menyematkan widget framework asing secara lazy. Ini adalah nilai jual utama yang wajib kita pertahankan dan tonjolkan!

---

## 3. Audit Pain Points SvelteKit di Build Log `harijadi` (Peluang Kita Lebih Baik)

Build log dan artefak produksi `harijadi` memperlihatkan lima pain point nyata yang harus kita hindari dan selesaikan lebih baik di ekosistem Aurelia + Hono:

| # | Pain Point di `harijadi` | Bukti Nyata | Akar Masalah di SvelteKit | Bagaimana Kita Bisa Lebih Baik |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **NFT Dependency Tracing Warnings** (`@opentelemetry/api`, `@neon-rs/load`, `ws` `bufferutil` / `utf-8-validate`) | `@sveltejs/adapter-vercel/index.js:494-531` mencetak warning kegagalan resolusi dari `nodeFileTrace` | `@vercel/nft` memindai AST secara statis dan menganggap optional peer dependencies (`bufferutil`, `utf-8-validate`, `@opentelemetry/api` di `respond.js:6-10`, fallback driver di `@libsql/client`) sebagai missing dependency | Bundling server via `Rolldown`/`Bun.build`/`esbuild` dengan konfigurasi `external` eksplisit untuk optional native addons & Hono single-bundle (`packages/hono-aurelia/src/builder.ts`), tanpa bergantung pada `@vercel/nft` heuristik |
| 2 | **Manual Postbuild Patch Script (`scripts/fix-vercel-nft.js`)** | `/home/dev/project/harijadi/scripts/fix-vercel-nft.js` (L28-L60) + `package.json` `build` script menyalin manual `ws`, `undici`, `@libsql/isomorphic-ws` ke `.vercel/output/functions/.../node_modules` | `nodeFileTrace` melewatkan paket yang di-import kondisional/dinamis (`await import('@libsql/client/http')` di `src/lib/server/db/index.ts:31-37` & dynamic exports `undici`/`ws`) | Di `@hono/aurelia`, gunakan bundler modern yang me-resolve dynamic branch atau deklarasi externals/bundle eksplisit, serta gunakan `fetch` standar Web alih-alih menarik `undici`/`ws` di serverless |
| 3 | **Chunk `chunks/auth.js` 335 kB & `createRequire` Global Shim** | `better-auth` menghasilkan chunk 335 kB + butuh shim `globalThis.require = createRequire(import.meta.url)` di `hooks.server.ts:1-6` dan `src/lib/server/db/index.ts:1-6` | ESM bundle di Rolldown/Vite tidak menyuntikkan shim CJS `require` untuk transitive CJS dependencies; auth server monolitik ikut ter-pull ke satu chunk catchall | Pisahkan endpoint auth secara modular lewat Hono sub-app (`app.route('/api/auth', authApp)`), tree-shake adapter server, dan hindari runtime CJS bridge di Edge/Workers |
| 4 | **15.958 Panggilan `resolveId` di `vite-plugin-sveltekit-guard`** | Build log mencatat 15.958 `resolveId` calls; implementasi di `@sveltejs/kit/src/exports/vite/plugins/guard.js:73-101` | Hook `resolveId` (`enforce: 'pre'`) mencegat **semua** import di client graph dan menjalankan `await this.resolve(...)` secara eager untuk mengisi `import_map` demi error reporting | Di `@aureliajs/vite-plugin-aux`, lakukan guard server-only **secara lazy/targeted**: hanya filter pola terlarang (`*.server.*`, `/server/`, `node:*`, `jsdom`, `linkedom`) di `resolveId`/`load`, dan telusuri `this.getModuleInfo(id).importers` **hanya saat pelanggaran terjadi** (0 overhead untuk 99,9% modul valid) |
| 5 | **Emisi `remote-entry.js` & Payload Tanpa Penggunaan `*.remote.ts`** | Output server memiliki `remote-entry.js` dan `chunks/remote.js`, padahal `harijadi` memiliki 0 file `*.remote.ts` | `exports/vite/build/index.js:137` selalu mendaftarkan `remote-entry` ke Rollup/Rolldown input tanpa memeriksa apakah `experimental.remoteFunctions` aktif atau ada file remote | Di `@hono/aurelia/build` & `@aureliajs/vite-plugin-aux`, terapkan prinsip **zero-unused-boilerplate**: jangan pernah meng-emit entry chunk atau runtime RPC jika fitur tidak diimpor/digunakan |

---

## 4. Ringkasan Matriks Rekomendasi & Peta Integrasi

| Inovasi / Fitur SvelteKit | Bukti Utama | Pemetaan Paket Kita / Core | Relevansi | Keselarasan Identitas Aurelia | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Route tree `+page`/`+layout`/`(group)` wajib** | `harijadi/src/routes/**`, `create_manifest_data/index.js` | `@hono/aurelia`, `@aurelia/router` | Sedang | Bertentangan dengan Hono-first & class/decorator CoC Aurelia | **`reject (paradigm mismatch)`** |
| **Co-located `.server` / `<script server>` split** | `+page.server.ts`, `vite-plugin-aux/src/types.ts:27` | `@aureliajs/vite-plugin-aux`, `@hono/aurelia` | Tinggi | Sangat selaras (opsional, CoC untuk `.aux` SFC) | **`build in our packages`** |
| **`hooks.server.ts` + `AsyncLocalStorage` (`getRequestEvent`)** | `harijadi/src/hooks.server.ts`, `respond.js` | `@hono/aurelia`, `@aureliajs/ssr` | Tinggi (konsep) | Kalah bersih dari Hono Middleware + `WeakMap<Request>` + `IRequestContext` DI | **`reject (paradigm mismatch)`** |
| **Compiler-stubbed `*.remote.ts` RPC** | `exports/vite/plugins/remote.js`, `runtime/server/remote-functions.js` | `@hono/aurelia` | Sedang | Magic bundler menyembunyikan HTTP boundary; Hono RPC (`hc`) lebih eksplisit | **`reject (paradigm mismatch)`** |
| **SSE `AsyncGenerator` live stream (`query.live`)** | `runtime/server/remote-functions.js:52-141` | `@hono/aurelia` | Sedang–Tinggi | Murni Web Standards (`ReadableStream` + `text/event-stream`) | **`build in our packages`** |
| **Form Actions + `use:enhance` progressive enhancement** | `DeskModals.svelte:197-255`, `runtime/app/forms/index.js` | `@hono/aurelia` (`aureliaAction` + new `au-enhance`) | **Sangat Tinggi** | 100% Web Standards (`<form>`, `FormData`, Custom Attribute) | **`build in our packages`** |
| **Router `invalidate` / reload lifecycle & `/__data` fetcher** | `desk/[slug]/+page.svelte:266`, `load_data.js`, `client.js:2691` | `@aurelia/router` (Core) & `@hono/aurelia` | Tinggi | Selaras dengan lifecycle `loading()` & `dataEndpoint` | **`offer boldly upstream`** (router reload/invalidate) & **`build in our packages`** (`dataEndpoint` client) |
| **Link Preloading (`hover`/`tap`) & History `snapshot`** | `src/app.html:28`, `client.js:2418`, `snapshots.js` | `@aurelia/router` (Core), `@aureliajs/islands` | Tinggi | Murni Web Standards (`history.state`, `sessionStorage`, HTML attrs) | **`offer boldly upstream`** |
| **`devalue.uneval` inline JS script** | `runtime/server/page/render.js:412-514` | `@aureliajs/ssr` | Rendah | Melanggar inert `<script type="application/json">` + strict CSP | **`reject (paradigm mismatch)`** |
| **`devalue.stringify`/`parse` JSON mode + deferred stream** | `runtime/server/page/render.js`, `serialize_data.js` | `@aureliajs/ssr/src/serialize.ts`, `@hono/aurelia` | Tinggi | Menjaga `Date`/`Map`/`Set`/`BigInt`/circular dalam JSON inert aman-XSS | **`build in our packages`** |
| **Explicit env schema (`src/env.ts` + public/private guard)** | `harijadi/src/env.ts`, `core/env.js`, `env-vars.js` | `@hono/aurelia`, `@aureliajs/vite-plugin-aux` | Tinggi | Selaras jika pakai Standard Schema & support Hono `c.env` | **`build in our packages`** |
| **`svelte-kit sync` `$types` codegen per route** | `core/sync/sync.js`, `write_types/index.js` | Aurelia Core vs `vite-plugin-aux` + `vscode-aux` | Sedang–Tinggi | Tidak perlu di Aurelia Core (DI + TS murni); perlu untuk `.aux` SFC DX | **`reject (paradigm mismatch)`** (Core) / **`build in our packages`** (`.aux` & `vscode-aux`) |
| **Server-only import guard (lazy, bukan 15.958 `resolveId`)** | `exports/vite/plugins/guard.js` | `@aureliajs/vite-plugin-aux` | Tinggi | Wajib untuk keamanan boundary server/client, tanpa overhead | **`build in our packages`** |
| **CSRF `Origin` validation untuk form/action POST** | `runtime/server/csrf.js`, `respond.js:100-129` | `@hono/aurelia` (`aureliaAction`) | **Sangat Tinggi** | Murni Web Standards + keamanan default | **`build in our packages`** |
| **Adapter API + `@vercel/nft` tracing** | `@sveltejs/adapter-vercel/index.js`, `fix-vercel-nft.js` | `@hono/aurelia/src/builder.ts` | Rendah | Hono native adapters + single-file bundler jauh lebih unggul | **`reject (paradigm mismatch)`** |
| **Offline outbox queue (`checkInQueue.ts`)** | `harijadi/src/lib/offline/checkInQueue.ts` | App-level (`au-enhance` `cancel()` hook saja) | Rendah | Melanggar prinsip *zero application leakage* di library | **`reject (paradigm mismatch)`** (simpan di app; beri hook di `au-enhance`) |

---

### Implikasi Strategis untuk Langkah Berikutnya (`@synthesizer`)
1. **Usulan Upstream ke `aurelia/aurelia` (`offer boldly upstream`)**: Fokuskan pada kapabilitas yang hanya bisa hidup bersih di `@aurelia/router` / core — khususnya mekanisme **invalidasi/reload lifecycle route (`loading`)** saat mutasi, **link preloading deklaratif**, dan **history navigation snapshot**, di samping perbaikan core SSR yang dianalisis di dokumen `01`.
2. **Eksekusi di Paket Kita (`build in our packages`)**: Prioritas tertinggi dengan ROI paling tinggi untuk fullstack Aurelia 2 di atas Hono adalah:
   - **`au-enhance` Custom Attribute + CSRF `Origin` guard** di `@hono/aurelia` (menutup celah progressive enhancement & keamanan form action);
   - **`devalue.stringify`/`parse` + deferred streaming payload** di `@aureliajs/ssr`;
   - **Lazy server-only import guard** & **inferensi tipe `<script server>` untuk `.aux`** di `@aureliajs/vite-plugin-aux` + `vscode-aux`.
3. **Diferensiasi Kompetitif Kita**: Pertahankan keunggulan yang tidak dimiliki SvelteKit (`@aureliajs/islands` untuk Zero-JS selective hydration dan `@aureliajs/bridge` untuk migrasi bertahap React/Vue/Svelte/HTMX) serta arsitektur Hono-first yang bebas dari kerumitan `@vercel/nft` maupun `15.958` `resolveId` guard calls.
