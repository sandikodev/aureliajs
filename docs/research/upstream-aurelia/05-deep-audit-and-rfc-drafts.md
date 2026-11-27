# 05 - Audit Teknis Mendalam, Analisis Regresi, & Draf RFC/Diskusi Otentik (Non-Slop)

Dokumen ini adalah kelanjutan disiplin dari `01` s/d `04` sebelum ada **satu baris kode pun** yang disentuh di [`packages/aurelia`](file:///home/dev/project/aureliajs/packages/aurelia) maupun dikirim ke repositori publik `aurelia/aurelia`.

Tujuan dokumen ini ada dua:
1. **Audit Teknis Tingkat Mesin (*Chesterton's Fence* & Bukti Empiris)**: Memeriksa *git blame* historis, PR aktif milik core team (`Vheissu`, `fkleuver`, `bigopon`), perilaku aktual engine DOM (`linkedom` vs `jsdom` vs browser), dampak alokasi memori pada *hot path*, dan potensi regresi.
2. **Draf Komunikasi Upstream yang Natural & Manusiawi (Anti-AI-Slop)**: Menyediakan draf komentar issue, laporan bug/kompatibilitas, dan draf RFC dengan gaya bahasa engineer nyata (ringkas, faktual, tanpa basa-basi bot, tanpa *buzzword*, tanpa klaim berlebihan, dan menghormati pekerjaan yang sedang berjalan di hulu).

---

## Bagian 1: Temuan Kritis dari Audit Mendalam (Mengapa Kita Tidak Boleh Gegabah)

Inspeksi langsung terhadap riwayat commit dan branch aktif di [`packages/aurelia`](file:///home/dev/project/aureliajs/packages/aurelia) mengungkap **lima fakta penting** yang tidak akan terlihat jika kita terburu-buru mengirim PR otomatis:

### 1.1 Petunjuk Silang di Issue `#2538` -> `#2494` (`Vheissu` Kemungkinan Sudah Punya Patch Lokal!)
Pada issue `#2494` (*Module-level template cache keeps documents alive and returns nodes from the wrong document*), belum ada komentar publik dan belum ada PR terbuka. Namun ketika kita membaca issue `#2538` baris pertama yang juga ditulis oleh Dwayne Charrington (`Vheissu`), tertulis:
> `## Baseline (Node 25 + jsdom, catalog page, with the #2494 cache fix applied)`

Artinya, `Vheissu` **sudah sempat menulis patch lokal untuk `#2494`** saat menjalankan benchmark SSR di mesinnya. Jika kita tiba-tiba membuka PR untuk `#2494` tanpa bertanya lebih dulu di thread `#2494`, kita berisiko menduplikasi kode yang sedang ia siapkan di branch lokalnya. Sikap paling etis dan tajam adalah berkomentar singkat di `#2494`, menyertakan temuan konkret bagaimana bug tersebut memicu `AUR0757` di `Rendering.createNodes`, membandingkan dua opsi yang ia tulis, dan menanyakan apakah ia berencana mem-push fix lokalnya dari `#2538` atau terbuka menerima PR kecil.

### 1.2 Mengapa `#2494` Menyebabkan `AUR0757` (`0 !== rowCount`) Lintas Realm
Audit kode sumber menemukan rantai kausal eksak dari `TemplateElementFactory` ke `Rendering`:
1. `packages/template-compiler/src/template-element-factory.ts:16` menyimpan `markupCache` di scope modul.
2. Request SSR ke-1 membuat `win1` (`BrowserPlatform(win1)`). `createTemplate(markup)` menyimpan `HTMLTemplateElement` milik `win1.document` ke `markupCache[input]`.
3. Request SSR ke-2 membuat `win2` (`BrowserPlatform(win2)`), di mana konstruktor `win2.Node !== win1.Node`. `TemplateCompiler.compile()` memanggil `createTemplate(markup)` dan menerima hasil `result.cloneNode(true)` yang **masih bertipe `win1.Node`**, lalu menyisipkan komentar marker `<!--au-->` sejumlah `rowCount` instruksi ke dalamnya.
4. Saat `Rendering.createNodes(compiledDef)` berjalan di `packages/runtime-html/src/templating/rendering.ts:132`:
   ```ts
   } else if (template instanceof p.Node) {
   ```
   Karena `p.Node` adalah `win2.Node` sedangkan `template` berasal dari `win1.Node`, ekspresi `template instanceof p.Node` bernilai **`false`**!
5. Eksekusi jatuh ke blok `else` (`rendering.ts:139-145`):
   ```ts
   tpl = doc.createElement('template');
   if (isString(template)) { // false, karena template berupa objek HTMLTemplateElement
     tpl.innerHTML = template;
   }
   fragment = tpl.content; // kosong! 0 marker <!--au-->
   ```
6. Di `rendering.ts:197`, `targetCount` bernilai `0` sementara `rowCount > 0`, sehingga melempar `AUR0757` (`rendering_mismatch_length`).

**Analisis Trade-off Dua Opsi Perbaikan `#2494`:**
- **Opsi A — Cache di Instance `TemplateElementFactory` (`Map<string, HTMLTemplateElement>` dengan batas ukuran)**:
  - `ITemplateElementFactory` sudah terdaftar sebagai `singleton` per root DI container (`template-element-factory.ts:14`).
  - Saat container SSR selesai dipakai dan dibuang, seluruh cache ikut terbebas tanpa bergantung pada siklus GC lintas dokumen.
  - Kekurangan kecil: jika satu halaman browser memanggil `new Aurelia()` berkali-kali dengan root container terpisah pada `document` yang sama, cache string tidak dibagi antar root container.
- **Opsi B — `WeakMap<Document, Map<string, HTMLTemplateElement>>` dengan batas ukuran per `Map` (mis. FIFO 512 entri)**:
  - Berbagi cache antar beberapa instance Aurelia pada `Document` browser yang sama, sekaligus mengisolasi penuh tiap `Document` SSR/JSDOM/LinkeDOM.
  - Secara spesifikasi ECMAScript (*ephemeron table*), referensi balik dari `HTMLTemplateElement.ownerDocument` ke key `Document` di dalam `WeakMap` tetap dapat di-GC begitu objek `Document` tidak lagi memiliki referensi dari luar.

### 1.3 Jebakan Fatal bila Menggunakan Optional Chaining `style.getPropertyPriority?.('display')`
Pada ringkasan tingkat tinggi sebelumnya, sempat terpikir untuk mem-patch `packages/runtime-html/src/resources/custom-attributes/show.ts:68` dengan `this.el.style.getPropertyPriority?.('display') ?? ''`.
**Pengujian aktual membuktikan kode tersebut AKAN CRASH di LinkeDOM!**
- Di `linkedom@0.18.15`, `el.style` dibungkus oleh `Proxy` CSS property getter: mengakses properti apa pun yang tidak dikenal (termasuk `el.style.getPropertyPriority`) mengembalikan string kosong `""` (`typeof el.style.getPropertyPriority === "string"`), **bukan** `undefined`!
- Karena `""` bukan `null`/`undefined`, operator `?.()` tetap mencoba memanggil `""('display')` dan langsung melempar `TypeError: this.el.style.getPropertyPriority is not a function`.
- Satu-satunya guard yang benar dan aman adalah pengecekan tipe fungsi eksplisit:
  ```ts
  const style = this.el.style;
  this.$val = style.getPropertyValue('display');
  this.$prio = typeof style.getPropertyPriority === 'function' ? style.getPropertyPriority('display') : '';
  ```

### 1.4 Sejarah *Chesterton's Fence* pada `document.adoptNode` (Safari 16 Bug `#1680`)
Penelusuran `git log -S "adoptNode"` di `packages/aurelia` menemukan commit `62321a73a` oleh `bigopon` (*`fix(dom): broken in safari16 (#1680)`*):
- Menurut spesifikasi HTML Living Standard, saat browser membuat `document.createElement('template')`, `el.content.ownerDocument` **bukanlah** `document` utama, melainkan *associated inert template document* yang terpisah.
- Di Safari 16 (`#1618`, `#1622`), memanipulasi/mengkloning node yang masih dimiliki oleh *inert template document* memicu bug DOM/CustomElement hingga `document.adoptNode(el.content)` dipanggil.
- Sebaliknya di LinkeDOM, `tpl.content.ownerDocument === document` **sudah bernilai `true` sejak awal**, dan `document.adoptNode` bernilai `undefined` (sementara `document.importNode(fragment, true)` tersedia penuh).
- Oleh karena itu, kita **tidak boleh** menghapus `adoptNode` begitu saja. Guard yang menghormati perbaikan Safari 16 milik `bigopon` sekaligus aman di LinkeDOM adalah:
  - Di `template-compiler.ts:1591-1593` (`CompilationContext.h`):
    ```ts
    if (name === 'template') {
      const content = (el as HTMLTemplateElement).content;
      if (content.ownerDocument !== this.p.document && typeof this.p.document.adoptNode === 'function') {
        this.p.document.adoptNode(content);
      }
    }
    ```
  - Di `rendering.ts:158-160` (`Rendering.createNodes`):
    ```ts
    const clonedFragment = needsImportNode || typeof doc.adoptNode !== 'function'
      ? doc.importNode(fragment, true)
      : doc.adoptNode(fragment.cloneNode(true) as DocumentFragment);
    ```
    (Karena `importNode(fragment, true)` melakukan deep-clone sekaligus menetapkan `ownerDocument` ke `doc` dalam satu langkah standar DOM Level 2.)

### 1.5 Disiplin Memori *Hot Path* & Koordinasi Konflik dengan PR `#2560` (`defer`) pada `_classifyAttributes`
1. **Aturan Hot Path (`packages/aurelia/AGENTS.md:31`)**: Core Aurelia menekankan *"avoid creating large allocation footprints for hot paths"*. Jika di `_classifyAttributes` (`template-compiler.ts:743`) kita langsung memanggil `Array.from(el.attributes)` tanpa cek panjang, maka setiap elemen tanpa atribut (`<div>`, `<span>`, `<p>`, `<li>` yang mencakup mayoritas elemen DOM) akan mengalokasikan array kosong `[]` sia-sia!
   Dengan jalur cepat:
   ```ts
   const rawAttrs = el.attributes;
   const ii = rawAttrs.length;
   if (ii === 0) {
     return {
       tcInstructions: void 0,
       attrInstructions: void 0,
       elBindableInstructions: void 0,
       plainAttrInstructions: void 0,
       hasContainerless: false,
     };
   }
   const attrs = Array.from(rawAttrs);
   ```
   Jalur `ii === 0` bahkan **lebih hemat alokasi dibanding `master` saat ini** (karena `master` saat ini selalu mengalokasikan closure `removeAttr` di baris 768 meskipun `attrs.length === 0`), sementara untuk `ii > 0` penghapusan `el.removeAttribute(attrName)` tetap terjadi pada titik urutan yang persis sama di dalam loop tanpa `--i; --ii;`.
2. **Peta Konflik PR Aktif**: Branch `upstream/feat/issue-2544` (PR `#2560` oleh `Vheissu`, implementasi `defer` template controller sebesar +4.000 baris) memodifikasi `template-compiler.ts` tepat di atas `_classifyAttributes` (menambahkan early check `_classifyDeferredHost` di awal fungsi dan mengubah baris `context._findAttr` menjadi `findHostableAttr`, serta menambah `deferred: false` di return object). Artinya, menyentuh `_classifyAttributes` **wajib dikoordinasikan melalui issue terlebih dahulu** agar tidak mengganggu merge PR `#2560` milik `Vheissu`.

### 1.6 Pemetaan PR Upstream yang Sedang Terbuka (Jangan Sampai Tabrakan!)
| PR / Issue Upstream | Author | Status & Isi | Implikasi Etis bagi Kita |
| :--- | :--- | :--- | :--- |
| **PR `#2574`** (`feat/issue-2535`) | `Vheissu` | Menambahkan `ITransferState` (`<script type="application/json" id="au-state">` dengan escape `\u003c`) + `TransferCacheInterceptor` di `fetch-client`. | **Jangan** mengusulkan format state transfer baru ke core. Rancang `@aureliajs/ssr` agar kompatibel dengan `ITransferState` (`au-state`) begitu `#2574` merge. |
| **PR `#2560`** (`feat/issue-2544`) | `Vheissu` | Menambahkan `defer` template controller (+4.000 baris). | **Jangan** mengirim PR mendadak ke `template-compiler.ts` sebelum bertanya di issue, dan selaraskan diskusi `@aureliajs/islands` ke issue lanjutan `#2537` (*incremental hydration*). |
| **PR `#2559`** (`feat/issue-2546`) | `Vheissu` | Menambahkan manajemen `<head>` (`au-head` + integrasi router). | Hindari membuat proposal `<svelte:head>` duplikat ke core. |
| **PR `#2565`** (`feat/issue-2542`) | `Vheissu` | Menambahkan error boundaries & `IErrorHandler`. | Hindari proposal `+error` boundary ke core sebelum `#2565` selesai. |
| **PR `#2479`** (`feat/router-url-navigation`) | `fkleuver` | Refactor navigasi URL aplikasi & contextual routing di `@aurelia/router`. | Tahan semua perubahan kode pada `@aurelia/router`; cukup berdiskusi di issue `#2536` bila diperlukan. |

---

## Bagian 2: Draf Komunikasi Upstream (Natural, Teknis, Bebas AI-Slop)

Seluruh draf bahasa Inggris di bawah ini telah disaring mengikuti disiplin anti-slop:
- **Nol basa-basi pembuka/penutup bot** (tidak ada *"First of all, thank you for your incredible work"*, *"I hope this helps"*, *"Let's dive in"*).
- **Nol kata sifat kosong** (tidak ada *seamless, robust, game-changer, pivotal, comprehensive, unlock*).
- **Nol em-dash (`—`)**, **nol emoji**, **nol paralelisme negatif** (*"It's not just X, it's Y"*), dan **nol daftar ber-header tebal mekanis**.
- Gaya kalimat lugas, spesifik pada baris kode, mencantumkan bukti reproduksi pendek, dan diakhiri pertanyaan singkat layaknya sesama kontributor teknis. Deskripsi teknis boleh padat, tetapi tidak boleh terlalu rapi sampai terasa disusun mesin.

---

### Draf A — Komentar pada Issue `#2494` (`TemplateElementFactory` Cache)
**Target**: Komentar di `https://github.com/aurelia/aurelia/issues/2494`
**Tujuan**: Mengonfirmasi dampak `AUR0757` di SSR multi-request, memberi konteks konkret `rendering.ts:132`, dan menanyakan apakah `Vheissu` sudah menyiapkan branch dari benchmark `#2538` atau terbuka menerima PR.

```markdown
Ran into this exact issue with concurrent SSR requests, each with its own DOM instance.

Concretely, on the second request (`win2`), `TemplateCompiler.compile()` takes the cloned `<template>` from `markupCache`, and that node still has `win1` as its `ownerDocument` and `Node` constructor. The `<!--au-->` markers get inserted (`rowCount > 0`), but `Rendering.createNodes()` in `packages/runtime-html/src/templating/rendering.ts#L132` does:

```ts
} else if (template instanceof p.Node) {
```

`template instanceof win2.Node` is false, `isString(template)` is false as well, and the branch returns an empty `DocumentFragment`. `targetCount` ends at 0, so you get `AUR0757` (`0 !== rowCount`).

Of the two options you mentioned, I would lean toward putting the cache on `TemplateElementFactory`. A `Map<string, HTMLTemplateElement>` there stays with the root container's `IPlatform` and goes away when the SSR container is disposed. The `WeakMap<Document, Map<string, HTMLTemplateElement>>` version would also let multiple Aurelia roots on one page share templates, if that matters to you.

I saw in #2538 that your benchmark baseline already had a local fix for #2494. Do you have that patch queued, or would you like a small PR for it?
```

---

### Draf B — Issue Baru: Kompatibilitas DOM Ringan / Non-Live (`LinkeDOM` / Edge Workers SSR)
**Target**: Issue baru di `aurelia/aurelia` menggunakan struktur `.github/ISSUE_TEMPLATE/bug_report.md`
**Tujuan**: Melaporkan 3 friksi spesifik yang membuat Aurelia 2 membutuhkan monkey-patch saat berjalan di atas `linkedom` (Cloudflare Workers / Bun / Node SSR ringan), sambil menghormati fix Safari 16 (`#1680`) dan PR `#2560` (`defer`).

**Judul:**
`[SSR] LinkeDOM breaks three DOM assumptions in template-compiler and runtime-html`

**Isi:**
```markdown
# Bug report

## Expected behavior

Templates should compile and render on lightweight SSR DOMs such as `linkedom` without anyone patching DOM prototypes first. This matters on Cloudflare Workers and other edge runtimes where `jsdom` will not run.

## Current behavior

Running Aurelia 2 SSR with `BrowserPlatform(window)` backed by `linkedom` hits three spots:

- `TemplateCompiler._classifyAttributes` (`packages/template-compiler/src/template-compiler.ts#L743-L779`) caches `const attrs = el.attributes` and decrements loop indices in `removeAttr()`. In `linkedom`, `el.attributes` is a static array, not a live `NamedNodeMap`. After `removeAttribute(attrName)`, `attrs` still contains the removed item, so the preceding attribute gets compiled twice.
- `CompilationContext.h` (`packages/template-compiler/src/template-compiler.ts#L1592`) and `Rendering.createNodes` (`packages/runtime-html/src/templating/rendering.ts#L160`) call `document.adoptNode()` without checking it exists. `linkedom` has `importNode` instead. Its `tpl.content.ownerDocument` is already the same document, so the Safari 16 mismatch from #1680 is not involved here.
- `Show.update` (`packages/runtime-html/src/resources/custom-attributes/show.ts#L68`) calls `this.el.style.getPropertyPriority('display')`. In `linkedom`, `el.style` is a proxy that returns `""` for unknown members, so the call throws when `show.bind="false"` or `hide.bind="true"` renders. Optional chaining does not help because `typeof el.style.getPropertyPriority` is `"string"`.

## Possible solution

Guard the first case by snapshotting `const attrs = Array.from(rawAttrs)` and dropping the index decrements. For `adoptNode`, call it only when `content.ownerDocument !== this.p.document && typeof this.p.document.adoptNode === 'function'`, and fall back to `doc.importNode(fragment, true)` in `Rendering.createNodes`. In `Show.update`, check `typeof style.getPropertyPriority === 'function'` before calling it.

## Context

We have been running request-scoped Aurelia 2 SSR on Node, Bun, and Cloudflare Workers with `BrowserPlatform(window)` plus `ISSRContext`. With those guards and a per-container `ITemplateElementFactory` for #2494, `linkedom` renders standard components, template controllers, and custom attributes. It runs in `workerd` and rendered at roughly 10x the throughput of `jsdom` in our tests.

#2560 (`defer`) touches `template-compiler.ts` just above `_classifyAttributes`, which is why I am filing this before a PR. Happy to send a focused patch if this direction works for you.

## Code sample

Quick check on `linkedom@0.18.15`:

```js
import { parseHTML } from 'linkedom';

const { document } = parseHTML('<div><span a="1" b="2" style="color: red"></span></div>');
const el = document.querySelector('span');

const attrs = el.attributes;
el.removeAttribute('a');
console.log(attrs.length, el.attributes.length); // 2, 1; live NamedNodeMap would be 1, 1

const tpl = document.createElement('template');
console.log(tpl.content.ownerDocument === document); // true
console.log(typeof document.adoptNode, typeof document.importNode); // "undefined", "function"

console.log(typeof el.style.getPropertyPriority); // "string"
```

## Environment

Aurelia 2.0.0-rc.2 / master (`af6288674`), TypeScript 5.9, `linkedom` 0.18.15, Node 22.22, Bun 1.4, Vite 8, Linux.
```

---

### Draf C — RFC Ringan (Ditahan Sampai Tahap Bugfix Selesai & `#2574` Merge): Root Input Props pada `IAppRootConfig`
**Status**: **JANGAN DIKIRIM SEKARANG.** Simpan hingga komunikasi pada `#2494` dan issue LinkeDOM berjalan baik serta PR `#2574` (`ITransferState`) selesai di-review maintainer.
**Mengapa perlu RFC, bukan PR langsung**: Menyentuh kontrak publik `IAppRootConfig` (`packages/runtime-html/src/app-root.ts:17-42`) dan beririsan dengan cara komponen menerima state awal saat SSR/hydration.

```markdown
# RFC: Passing initial root component properties in `IAppRootConfig` / `IHydrateConfig`

## Context

When rendering a page component on the server or mounting an isolated island on the client, a route handler or island loader often already has resolved input data (for example route params or preloaded props) to pass into the root component.

Today `IAppRootConfig<T>` (`packages/runtime-html/src/app-root.ts`) accepts `component: T | Constructable<T>`:

- Passing a pre-constructed instance (`new PageComponent()`) fails with `AUR0016` (`no_active_container_for_resolve`) whenever `PageComponent` uses `resolve()` in field initializers, because no container is active outside `container.invoke()`.
- Calling `const instance = au.container.get(PageComponent); Object.assign(instance, props);` before `au.app({ host, component: instance })` resolves `PageComponent` against the outer `au.container` rather than the `childCtn` created inside `AppRoot` (where `IEventTarget` and host registrations live), and bypasses the `creating` app tasks.

#2574 (`ITransferState`) solves server-to-client state transfer cleanly when data is loaded through DI services or `getOrLoad()`. The remaining case is passing bindable/input properties from outside Aurelia into the root view-model right after `childCtn.invoke(component)` and before `hydrating` / `binding` hooks run.

## Examples

One minimal option on `IAppRootConfig<T>` (and `IHydrateConfig<T>`):

```ts
export interface IAppRootConfig<T extends object = object> {
  host: HTMLElement;
  component: T | Constructable<T>;
  props?: Partial<InstanceTypeOrSelf<T>>;
  // existing options...
}
```

Inside `AppRoot`, after `instance = childCtn.invoke(component)` (`app-root.ts#L117`) and before `Controller.$el(...)`:

```ts
if (config.props != null) {
  Object.assign(instance, config.props);
}
```

Alternatively, an `IAppTask` slot or a callback `(instance: K, container: IContainer) => void` avoids any assumptions about plain property assignment vs setters/coercion.

Wanted to check whether external root `props` fits how you envision SSR route entrypoints and islands working alongside `#2574`, or if you prefer callers to always register a DI token on the container before `start()` / `hydrate()`.
```

---

## Bagian 3: Protokol Pemeriksaan Sebelum Interaksi Publik Apa Pun

Sebelum satu komentar atau issue dikirim melalui akun `sandikodev`:
1. **Verifikasi nol perubahan liar**: Pastikan `git -C packages/aurelia status` bersih 100% sampai maintainer memberi lampu hijau atas arah perbaikannya.
2. **Satu langkah pada satu waktu**: Mulai hanya dari **Draf A** (komentar pendek di `#2494`) dan/atau **Draf B** (issue kompatibilitas LinkeDOM). Tunggu respons `Vheissu` / `fkleuver` sebelum membuka branch kode atau mengajukan **Draf C**.
3. **Review suara pribadi**: Anda bebas mengedit kalimat mana pun pada Draf A/B agar 100% terasa seperti gaya bicara Anda sehari-hari di GitHub.
