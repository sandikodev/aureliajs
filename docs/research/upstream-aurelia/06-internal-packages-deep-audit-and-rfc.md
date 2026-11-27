# 06 - Audit Teknis Mendalam & Spesifikasi RFC Internal untuk Paket Milik Kita

Setelah `05` mengaudit kode hulu (`packages/aurelia`) dan menyiapkan draf komunikasi ke maintainer Aurelia, dokumen ini melakukan hal yang sama ketatnya terhadap **tujuh paket milik kita sendiri** sebelum satu baris pun kode penyempurnaan ditulis.

Inspeksi baris-demi-baris menemukan **6 bug/jebakan tersembunyi pada kode kita saat ini** yang belum tertangkap oleh 275 unit test yang ada, sekaligus merumuskan spesifikasi teknis (RFC internal) yang presisi untuk membawa ergonomi sekelas SvelteKit ke stack Aurelia 2 + Hono kita tanpa merusak arsitektur tipis yang sudah ada.

---

## Bagian 1: Enam Bug & Jebakan Tersembunyi yang Ditemukan pada Paket Kita Saat Ini

### 1.1 Jebakan `maxAge = 30_000` pada `hydrateFromServer()` Merusak Halaman Cache CDN / Prerender & Clock Skew
- **Lokasi**: [`packages/aurelia-ssr/src/hydrate.ts:90, 100-108`](file:///home/dev/project/aureliajs/packages/aurelia-ssr/src/hydrate.ts#L90-L108)
- **Mekanisme Masalah**:
  ```ts
  const maxAge = options?.maxAge ?? 30_000;
  const age = Date.now() - payload.timestamp;
  if (age > maxAge) {
    return null;
  }
  ```
  Ada dua skenario produksi nyata yang langsung rusak akibat default 30 detik ini:
  1. **Halaman Prerender / SSG / Edge Cache (`Cache-Control: public, s-maxage=3600`)**: Begitu HTML disimpan di CDN lebih dari 30 detik lalu dibuka user, `hydrateFromServer()` mengembalikan `null`. Selanjutnya di `createClientHydrator()` ([`hydrate.ts:205-213`](file:///home/dev/project/aureliajs/packages/aurelia-ssr/src/hydrate.ts#L205-L213)), `hydration?.component` menjadi `""`, sehingga bila aplikasi tidak menyetel satu komponen `fallback` tunggal, hydrator langsung gagal melempar `No component registered for ""`!
  2. **Clock Skew Perangkat User**: Pada SSR dinamis sekalipun, jika jam laptop/HP pengunjung lebih cepat 31 detik saja dibanding jam server, `Date.now() - payload.timestamp > 30_000` langsung bernilai `true` pada detik pertama halaman dimuat.
- **Keputusan Perbaikan**:
  - Ubah default `maxAge` menjadi `Infinity` (validasi umur hanya berjalan bila developer mengaktifkan `maxAge` secara eksplisit). Kesegaran dokumen HTTP adalah tanggung jawab `Cache-Control`, bukan perbandingan jam dinding client vs server.
  - Sekalipun `maxAge` disetel eksplisit dan kedaluwarsa, jangan buang identitas `payload.component`: kembalikan `{ component: payload.component, context: {} as TContext, initialData: undefined, timestamp: payload.timestamp, stale: true }` agar komponen halaman yang benar tetap ter-mount di client.

### 1.2 Urutan Eksekusi Terbalik pada Cabang `ssrScope` di `createClientHydrator()`
- **Lokasi**: [`packages/aurelia-ssr/src/hydrate.ts:236-248`](file:///home/dev/project/aureliajs/packages/aurelia-ssr/src/hydrate.ts#L236-L248)
- **Mekanisme Masalah**:
  ```ts
  if (hydration?.ssrScope) {
    const root = await app.hydrate({ host, component: ComponentClass, ssrScope: hydration.ssrScope });
    const instance = root.controller.viewModel as object;
    if (hydration.initialData && typeof hydration.initialData === 'object') {
      Object.assign(instance, hydration.initialData);
    }
  ```
  `await app.hydrate(...)` langsung membuat instance `ComponentClass` dengan nilai field default kosong (`posts = []`, `post = null`) lalu menjalankan siklus `hydrating` -> `binding` -> `bound` -> `attaching` terhadap DOM hasil SSR **sebelum** baris `Object.assign(instance, hydration.initialData)` sempat dieksekusi! Akibatnya, saat `binding()` berjalan, DOM SSR tertimpa state kosong terlebih dahulu (atau error bila template mengakses properti nested), baru kemudian di-render ulang oleh `Object.assign`.
- **Solusi Native Aurelia 2 (`AppTask.creating` / `AppTask.activating`)**:
   Berdasarkan audit `packages/aurelia/packages/runtime-html/src/app-root.ts:117,132,155`, slot `AppTask.activating` berjalan **tepat setelah** `childCtn.invoke(ComponentClass)` selesai membuat `root.controller.viewModel` (di dalam child container yang sah sehingga `resolve()` aman dari `AUR0016`), dan **tepat sebelum** `_controller.activate()` memicu `binding()`!
  Dengan mendaftarkan:
  ```ts
  AppTask.activating(IAppRoot, (root) => {
    if (initialData && typeof initialData === 'object') {
      Object.assign(root.controller.viewModel, initialData);
    }
  })
  ```
  baik jalur `app.hydrate()` maupun jalur `app.app({ host, component: ComponentClass }).start()` dapat langsung menerima class `ComponentClass` tanpa perlu lagi trik `app.container.get(ComponentClass)` di luar `childCtn`!

### 1.3 Bug `AUR0016` pada `aurelia-islands/src/loader.ts` saat Komponen Island Memakai `resolve()`
- **Lokasi**: [`packages/aurelia-islands/src/loader.ts:98-103`](file:///home/dev/project/aureliajs/packages/aurelia-islands/src/loader.ts#L98-L103)
- **Mekanisme Masalah**:
  `defaultHydrate` memanggil `new candidate()` secara langsung sebelum membuat `au = new Aurelia()`. Jika komponen island menggunakan `private readonly api = resolve(MyService)` atau `resolve(INode)` di field class-nya, pemanggilan `new candidate()` di luar DI container langsung melempar `AUR0016` (`no_active_container_for_resolve`).
- **Keputusan Perbaikan**:
  Buat instance `Aurelia` lebih dulu, daftarkan `AppTask.activating(IAppRoot, ...)` untuk menyuntikkan `ctx.props`, lalu teruskan konstruktor class `candidate` langsung ke `au.app({ host: ctx.element, component: candidate }).start()`.

### 1.4 Kebocoran Statis `node:fs` / `node:path` di Entry Utama `@hono/aurelia`
- **Lokasi**: [`packages/hono-aurelia/src/index.ts:14-22`](file:///home/dev/project/aureliajs/packages/hono-aurelia/src/index.ts#L14-L22) dan [`packages/hono-aurelia/src/server.ts:12-20`](file:///home/dev/project/aureliajs/packages/hono-aurelia/src/server.ts#L12-L20)
- **Mekanisme Masalah**:
  `index.ts` dan `server.ts` meng-export ulang `./builder` yang di baris atasnya mengimpor `node:fs` dan `node:path`. Padahal `package.json` sudah menyiapkan subpath khusus `"./build": "./dist/builder.js"` dan `test/builder.test.ts` sudah mengimpor dari `builder` secara terpisah. Jika user mengimpor `@hono/aurelia` pada Cloudflare Workers murni (tanpa flag `nodejs_compat`) atau Deno/WinterCG isolate tanpa tree-shaking agresif, import `node:fs` dari `builder.js` ikut tertarik.
- **Keputusan Perbaikan**:
  Keluarkan re-export `./builder` dari `index.ts` dan `server.ts` sehingga `buildClient`, `buildWorker`, `createVirtualClientPlugin`, dan `stubJsdomPlugin` eksklusif berada di `@hono/aurelia/build` (tambahkan juga pengujian eksplisit di `test/exports.test.ts` bahwa `.` dan `./server` bebas simbol `buildClient`/`buildWorker`).

### 1.5 Inkonsistensi Keamanan & Serialisasi pada `dataEndpoint` di `@hono/aurelia`
- **Lokasi**: [`packages/hono-aurelia/src/adapter.ts:259-270`](file:///home/dev/project/aureliajs/packages/hono-aurelia/src/adapter.ts#L259-L270)
- **Mekanisme Masalah**:
  Saat `dataEndpoint: true` menerima `Accept: application/json`, kode langsung memanggil `c.json({ component, title, context, initialData, timestamp })` mentah tanpa melewati `serializeState(..., serializeOpts)`. Akibatnya:
  1. Fungsi `serialize.replacer` (misalnya untuk menyensor field sensitif di `c.var`) dilewati begitu saja ketika penyerang/client mengirim header `Accept: application/json`!
  2. Nilai `BigInt` atau referensi melingkar (*circular reference*) yang aman di jalur HTML SSR justru menyebabkan HTTP 500 `TypeError` di jalur JSON!
- **Keputusan Perbaikan**:
  Jalankan `const payload = await serializeState(context, initialData, componentName, serializeOpts)` terlebih dahulu sebelum cabang `dataEndpoint`, lalu kembalikan `{ ...payload, title: effectiveTitle }` melalui `stringifyPayload` / response JSON yang seragam.

### 1.6 Dua Bug Nyata pada Tooling `.aux` (`vite-plugin-aux` HMR & `vscode-aux` `<script setup>`)
1. **HMR Mengabaikan Perubahan `<script setup>` & `<script server>`** ([`packages/vite-plugin-aux/src/index.ts:250-264`](file:///home/dev/project/aureliajs/packages/vite-plugin-aux/src/index.ts#L250-L264)):
   `handleHotUpdate` hanya memeriksa `prevDescriptor.script?.content !== newDescriptor.script?.content` dan `template`. Jika komponen memakai `<script setup>` atau `<script server>` dan memiliki blok `<style>`, setiap edit pada `<script setup>` dianggap "hanya perubahan style", sehingga Vite hanya me-reload CSS dan **tidak me-reload logika komponen**!
2. **`vscode-aux` Buta terhadap `<script setup>` dan Multi-Script** ([`packages/vscode-aux/src/parser.ts:65-82`](file:///home/dev/project/aureliajs/packages/vscode-aux/src/parser.ts#L65-L82) & [`analyzer.ts:55`](file:///home/dev/project/aureliajs/packages/vscode-aux/src/analyzer.ts#L55)):
   Regex `<script>` tidak memakai flag global dan tidak memisahkan atribut `setup` vs `server`, sementara `analyzer.ts` hanya mencari `ts.isClassDeclaration(node)`. Akibatnya, seluruh komponen `.aux` modern yang ditulis memakai `<script setup>` kehilangan fitur autocomplete, hover tipe, go-to-definition, dan validasi variabel di VS Code!

---

## Bagian 2: Spesifikasi RFC Internal — Fitur Kelas SvelteKit yang Selaras dengan Aurelia + Hono

Berikut rancangan kontrak teknis yang bersih, tipis, dan 100% berakar pada Web Standards + Aurelia DI sebelum mulai diimplementasikan:

### RFC-01: Serialisasi Kaya (`Date`, `Map`, `Set`, `BigInt`, `RegExp`, `URL`, Siklus) + Kompatibilitas `ITransferState` (`#2574`)
- **Masalah**: `sanitizeValue` di `@aureliajs/ssr/src/serialize.ts` saat ini meratakan `Date` menjadi string ISO biasa, `BigInt` menjadi string biasa, dan merusak `Map` / `Set` menjadi objek kosong `{}` karena memakai `Object.entries()`.
- **Mengapa Tidak Memakai `devalue.uneval()`**: `uneval()` menghasilkan kode JS eksekusi inline yang melanggar CSP ketat tanpa `'unsafe-inline'`.
- **Desain**:
  - Gunakan mode JSON murni (`devalue.stringify` / `devalue.parse`, atau codec tabel referensi JSON internal berukuran <1.5 KB tanpa dependensi eksternal bila ingin *zero runtime dependency bloat*) di dalam `<script type="application/json" id="__AURELIA_SSR_DATA__">` dengan tetap menjalankan XSS escape (`<`, `>`, `&`, `\u2028`, `\u2029`).
  - **Backward Compatibility**: Tambahkan field opsional `encoding: 'devalue' | 'json'` (atau deteksi struktur) sehingga payload JSON datar lama tetap terbaca mulus oleh `hydrateFromServer()`.
  - **Jembatan ke Upstream PR `#2574` (`ITransferState`)**: Saat Aurelia `2.0.0-rc.3` merilis `ITransferState` (`<script id="au-state">`), `renderDocument()` secara opsional ikut menyertakan output `ITransferState.serialize()` jika container SSR memilikinya, sehingga pengguna `fetch-client` Aurelia dan pengguna `loader()` Hono berjalan berdampingan tanpa bentrok ID script.

### RFC-02: Proteksi CSRF Berbasis Fetch-Spec + Kontrak Action Content-Negotiation (`aureliaAction`)
- **Lokasi**: `packages/hono-aurelia/src/adapter.ts`
- **Aturan CSRF Default (Tanpa Merusak Unit Test JSON)**:
  Pada `aureliaAction()` untuk metode mutasi (`POST`, `PUT`, `PATCH`, `DELETE`), aktifkan `csrf: true` secara default (dapat dikonfigurasi dengan `csrf?: boolean | { trustedOrigins?: string[] }`):
  1. Jika header `Sec-Fetch-Site === 'cross-site'`, tolak dengan `403 Forbidden`.
  2. Jika header `Origin` ada dan `Origin !== new URL(c.req.url).origin` (termasuk `Origin: null`) serta tidak ada di `trustedOrigins`, tolak dengan `403 Forbidden`.
  3. Jika `Origin` dan `Sec-Fetch-Site` keduanya absen (misalnya pada unit test `app.request('/path', { method: 'POST' })` atau server-to-server client), izinkan **kecuali** jika developer menyetel `requireOriginOnForms: true`. Ini mengikuti model keamanan browser nyata (browser modern selalu menyertakan `Origin` dan `Sec-Fetch-Site` pada `<form method="POST">` maupun `fetch` lintas situs) tanpa mematahkan test suite yang sudah ada.
- **Progressive Enhancement pada Response `aureliaAction()`**:
  - Jika request meminta JSON (`Accept: application/json` atau header `X-Aurelia-Enhance: 1`), kembalikan JSON action result seperti saat ini (mendukung status kustom dan error validasi).
  - Jika request berasal dari submit `<form>` HTML murni tanpa JS (`Accept` memuat `text/html` lebih tinggi dari `application/json`) dan `handler(c)` mengembalikan objek data biasa (bukan `Response` eksplisit), lakukan redirect otomatis `303 See Other` ke path halaman asal (`new URL(c.req.url).pathname + searchWithoutAction`) sesuai pola standar HTTP **Post/Redirect/Get (PRG)**!

### RFC-03: Custom Attribute `au-enhance` di `@hono/aurelia/client`
- **Bentuk Pemakaian di Template Aurelia / `.aux`**:
  ```html
  <form method="POST" action="/posts/${post.slug}?_action=comment" au-enhance="on-submit.bind: handleEnhance">
    <input name="body" required />
    <button type="submit">Kirim</button>
  </form>
  ```
- **Kontrak Teknis**:
  - Murni berupa Aurelia 2 `CustomAttribute` (`static readonly $au = { type: 'custom-attribute', name: 'au-enhance', ... }`) yang dapat didaftarkan otomatis oleh `createClientHydrator` atau diregistrasi manual lewat `EnhanceConfiguration`.
  - Saat `submit` dipicu:
    1. Membuat konteks `{ form, formData, actionUrl, submitter, cancel() }`.
    2. Jika callback `onSubmit` memanggil `cancel()`, hentikan pengiriman jaringan (memungkinkan aplikasi membangun *offline outbox queue* sendiri seperti di `harijadi` tanpa mengotori library!).
    3. Set atribut `data-au-submitting="true"` pada `<form>` untuk styling state loading CSS (`form[data-au-submitting] button { opacity: 0.5 }`) tanpa memaksa developer membuat variabel `isSubmitting` manual.
    4. Kirim `fetch(actionUrl, { method: 'POST', body: formData, headers: { Accept: 'application/json', 'X-Aurelia-Enhance': '1' } })`.
    5. Jika response redirect / sukses, jalankan callback hasil (default: me-reset form pada sukses 2xx + memanggil `navigator.invalidate()` agar data `loader` halaman saat ini di-refresh dari `dataEndpoint` secara in-place tanpa reload browser!).

### RFC-04: Soft Navigation, `data-au-preload="hover|tap"`, `invalidate()`, & `aureliaLayout()`
- **Client Navigator (`@hono/aurelia/client`)**:
  - Memperluas `createClientHydrator` (dengan opsi `clientNavigation?: boolean`, default `true` bila `dataEndpoint` tersedia, atau opt-in bersih tanpa mematahkan perilaku lama) yang mengembalikan controller `{ instance, navigate(url), invalidate(), preload(url), dispose() }`.
  - **Aturan Intersepsi `<a>` yang Ketat (Standar Web)**: Abaikan klik bila: bukan tombol kiri (`button !== 0`), memakai modifier (`metaKey`, `ctrlKey`, `shiftKey`, `altKey`), memiliki `target` selain `_self`, memiliki atribut `download` atau `rel="external"` atau `data-au-reload`, atau berbeda `origin`.
  - **Preloading**: Delegated listener pada `pointerenter` (dengan debounce ringan 20ms untuk `data-au-preload="hover"`) dan `pointerdown`/`touchstart` (`data-au-preload="tap"`) yang mem-fetch `Accept: application/json` ke cache memori berumur pendek (mis. 5 detik) sehingga saat klik terjadi, transisi halaman terasa 0ms.
  - **Swap Komponen Bersih**: Saat berpindah ke halaman dengan komponen sama (mis. `/posts/a` -> `/posts/b`), cukup perbarui `IRequestContext` dan assign `initialData` baru secara reaktif di instance aktif! Saat berpindah ke komponen berbeda, hentikan `AppRoot` sebelumnya dan mount komponen baru dari registry `components` serta update `document.title` dan `history.pushState`.
- **Cascading Layout Server (`aureliaLayout` di `@hono/aurelia`)**:
  - Helper komposisi Hono eksplisit (tanpa memaksa file-system routing): `aureliaLayout(AppShellLayout, { loader: layoutLoader })` sebagai middleware Hono yang menggabungkan data loader induk ke `context`/`initialData` anak melalui `WeakMap<Request>` yang sudah ada di `adapter.ts`!

### RFC-05: Penyempurnaan Compiler `.aux` & Analyzer `vscode-aux`
1. **Auto SSR Detection di `vite-plugin-aux`**: Di `transform(rawCode, id, ssrOpts)` dan `load(id, ssrOpts)`, hitung `const effectiveIsServer = options.isServer ?? Boolean(ssrOpts?.ssr || this.environment?.config?.consumer === 'server')` dan teruskan ke `compileAux`.
2. **Lazy Server-Only Import Guard**: Di `vite-plugin-aux` saat `!effectiveIsServer`, periksa hanya apakah modul yang di-resolve berakhiran `.server.ts`/`.server.js` atau berada di daftar `serverOnlyModules` (`node:*`, `jsdom`, `linkedom`, `@aureliajs/ssr/server`, `@hono/aurelia/server`). Hanya jika terdeteksi pelanggaran barulah telusuri rantai importer untuk pesan error yang jelas — **0 overhead** pada ribuan modul client biasa (menghindari 15.958 panggilan `resolveId` seperti di log build SvelteKit).
3. **True Zero-JS `<template server-only>`**: Saat `!effectiveIsServer` dan `isServerOnly === true`, `compileAux` memancarkan stub ringan tanpa menyertakan isi HTML template maupun logic berat ke bundle client.
4. **Dukungan Penuh `<script setup>` + `<script server>` di `vscode-aux`**:
   - Perbarui `packages/vscode-aux/src/parser.ts` agar mengekstrak `script`, `setupScript`, dan `serverScript` secara terpisah dengan offset karakter akurat terhadap dokumen asli.
   - Perbarui `packages/vscode-aux/src/analyzer.ts` agar mem-parsing deklarasi top-level `let`, `const`, `function`, dan getter di `<script setup>` sebagai anggota ViewModel (dengan inferensi `isBindable: !name.startsWith('_')`), serta membaca return type `export async function loader(...)` dari `<script server>` untuk memperkaya tipe variabel di template!

---

## Bagian 3: Urutan Eksekusi Bertahap (Tanpa Lompatan Berisiko)

Agar setiap perubahan mudah diaudit, tidak menimbulkan regresi pada 275 test yang ada, dan bebas *slop*:

- **Tahap 1 (Bugfix & Hardening Fondasi Paket Kita)**:
  1. Perbaiki 6 bug tersembunyi di atas (`hydrate.ts` `maxAge` & `AppTask.activating`, `aurelia-islands/loader.ts` `AUR0016`, pemisahan subpath `./build` di `@hono/aurelia`, penyatuan `serializeState` di `dataEndpoint`, HMR `setup/server` & auto `isServer` di `vite-plugin-aux`, serta parser/analyzer `<script setup>` di `vscode-aux`).
  2. Tambahkan unit test spesifik untuk keenam kasus tersebut dan pastikan seluruh workspace tetap 100% lulus `bun test`, `bun run typecheck`, dan `bun run lint`.
- **Tahap 2 (Fitur Inti Paritas SvelteKit di `@aureliajs/ssr` & `@hono/aurelia`)**:
  1. Codec serialisasi tipe kaya (`Date`, `Map`, `Set`, `BigInt`, `RegExp`, `URL`, circular) di `@aureliajs/ssr`.
  2. CSRF `Origin`/`Sec-Fetch-Site` guard + PRG HTML fallback di `aureliaAction()`.
  3. Custom Attribute `au-enhance` + soft navigation (`navigate`, `invalidate`, `data-au-preload`) di `@hono/aurelia/client`.
- **Tahap 3 (Interaksi Publik Upstream Aurelia)**:
  - Mengirim Draf A (`#2494`) dan Draf B (LinkeDOM issue) dari [`05-deep-audit-and-rfc-drafts.md`](./05-deep-audit-and-rfc-drafts.md) hanya ketika Anda menginstruksikan untuk mempublikasikannya ke GitHub `aurelia/aurelia`.
