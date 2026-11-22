# The Resumable Frontier: Manifesto Rekayasa Radikal Aurelia 2, Svelte DX, Hono, dan Qwik
### Blueprint Eksperimen Lintas Ekosistem: Dari Single-File Component Web Standards hingga Cakrawala Resumability

> **Pencetus & Inisiator**: Sandikodev (@sandikodev)  
> **Target Pembaca**: Systems Architects, Compiler Engineers, Open-Source Contributors, dan Experimentor Komunitas  
> **Status**: Living Architectural Manifesto & Community Research Blueprint  
> **Repositori**: `/home/dev/project/aureliajs`

---

## Daftar Isi
1. [Prolog: Mengapa Eksperimen Ini Lahir dan Harus Ekstrim?](#1-prolog-mengapa-eksperimen-ini-lahir-dan-harus-ekstrim)
2. [Etika Komunitas, Sikap Terbuka, dan Garis Demarkasi](#2-etika-komunitas-sikap-terbuka-dan-garis-demarkasi)
3. [Sintesis Empat Pilar: Meminjam Filosofi Lintas Ekosistem](#3-sintesis-empat-pilar-meminjam-filosofi-lintas-ekosistem)
4. [Tiga Lapisan Tanggung Jawab (Separation of Concerns)](#4-tiga-lapisan-tanggung-jawab-separation-of-concerns)
5. [Bedah DX: Mengapa `.aux` (Aurelia in HTML) Terasa Seperti Svelte & Astro?](#5-bedah-dx-mengapa-aux-aurelia-in-html-terasa-seperti-svelte--astro)
6. [Cakrawala Resumability: Melampaui Beban Hidrasi Konvensional ala Qwik](#6-cakrawala-resumability-melampaui-beban-hidrasi-konvensional-ala-qwik)
7. [Islands Architecture vs. Resumability: Memetakan Niche Pasar](#7-islands-architecture-vs-resumability-memetakan-niche-pasar)
8. [Panduan bagi Rekan Experimentor & Kontributor](#8-panduan-bagi-rekan-experimentor--kontributor)
9. [Epilog: Panggilan Kolaborasi Terbuka](#9-epilog-panggilan-kolaborasi-terbuka)

---

## 1. Prolog: Mengapa Eksperimen Ini Lahir dan Harus Ekstrim?

Dunia rekayasa web frontend saat ini sedang terjebak dalam siklus kompromi yang melelahkan. Di satu sisi, kita disuguhi framework-framework raksasa berbasis Virtual DOM yang membebani browser dengan hidrasi penuh (*waterfall execution*), bundle raksasa, dan abstraksi yang menjauh dari standar web W3C. Di sisi lain, alat-alat modern seperti Astro dan Svelte telah membuktikan betapa indahnya menulis HTML bersih, sementara Qwik mendobrak batas performa dengan konsep *Resumability*.

Namun, di mana posisi **Aurelia 2**?

Aurelia 2 adalah permata tersembunyi. Diciptakan oleh Rob Eisenberg dan tim intinya, Aurelia memiliki fondasi yang paling bersih di industri: **Direct-DOM manipulation**, **tanpa Virtual DOM**, **W3C Custom Elements native**, dan **Fine-Grained Observation**. Meskipun konvensi dual-file (`.ts` + `.html`) sangat dibanggakan di dalam komunitasnya karena memisahkan View dan ViewModel secara murni, bagi developer luar yang terbiasa dengan ekosistem Single-File Component, hadirnya format terpadu menjadi daya tarik tersendiri untuk mengeksplorasi Aurelia tanpa hambatan navigasi berkas.

Lebih dari sekadar pembagian berkas, akar masalah utama yang memicu friksi bagi developer awam adalah **benturan model mental (*cognitive dissonance*)**. Mayoritas developer modern dibesarkan di dunia **React (JSX/TSX)** dengan paradigma $\text{UI} = f(\text{state})$, **Vue** dengan SFC `<script setup>`, **Flutter (Dart)** dengan widget tree imperatif, **Svelte** dengan kompilasi runes/assignment, **Astro** dengan frontmatter, atau **Qwik** dengan penanda lexical `$`. Ketika melangkah ke dunia Aurelia, semuanya terasa sangat asing—kecuali bagi mereka yang sudah memiliki latar belakang **AngularJS (1.x) atau Angular (2+)**. 

Kedekatan sintaksis dan semantik antara Aurelia dan Angular bukanlah kebetulan belaka; keduanya berbagi garis keturunan sejarah langsung dari perancangan arsitektur awal Angular 2 di Google oleh Rob Eisenberg sebelum ia mendirikan Aurelia.

> 📘 **Telaah Historis & Semantik Mendalam**:  
> Analisis komprehensif mengenai sejarah di balik layar di Google, perbandingan sintaksis *head-to-head* Angular vs Aurelia, serta dekonstruksi mental model warga React/Vue/Flutter dijabarkan secara khusus dalam dokumen pendamping:  
> 👉 [**The Angular-Aurelia Heritage: Sejarah, Semantik, dan Rekonsiliasi Mental Model Frontend**](the-angular-aurelia-heritage.md).

Eksperimen di repositori ini (`/home/dev/project/aureliajs`) lahir dari sebuah ambisi yang mungkin terdengar **radikal, ekstrim, atau tidak konvensional**:

> **"Bagaimana jika kita mengambil fondasi Direct-DOM Aurelia 2 yang agnostik, memberikannya Developer Experience (DX) Single-File Component sebersih HTML biasa ala Svelte dan Astro (`.aux`), mengawinkannya dengan runtime super ringan modern (Hono), dan mengarahkannya menuju evolusi pamungkas: Resumability ala Qwik?"**

Eksperimen ini bukan untuk meremehkan apa yang telah dibangun oleh core team masing-masing framework. Justru sebaliknya: ini adalah bentuk penghormatan tertinggi (*reverence through exploration*)—mencoba menguji batas terjauh dari apa yang mungkin dicapai ketika filosofi-filosofi terbaik ini dikorelasikan secara berani.

---

## 2. Etika Komunitas, Sikap Terbuka, dan Garis Demarkasi

Sebagai inisiator eksperimen ini, penting bagi kita untuk menetapkan etika dan transparansi yang jelas agar tidak menimbulkan kebingungan bagi komunitas resmi Aurelia maupun Hono:

1. **Otoritas Kanonikal Tetap pada Core Team Resmi**:
   - Otoritas resmi Aurelia 2 berada penuh di bawah tim inti [Aurelia](https://github.com/aurelia/aurelia).
   - Otoritas resmi Hono berada penuh di bawah Yusuke Wada dan tim [Hono](https://github.com/honojs/hono).
   - Repositori ini adalah **Community Laboratory & Research Sandbox** mandiri oleh Sandikodev (@sandikodev).
2. **Komunikasi Terbuka & Kesiapan Berdialog**:
   - Jika komunitas atau core team merasa pendekatan ini terlalu agresif atau berbeda haluan, kita siap berdiskusi, bernegosiasi mengenai *trade-off*, atau memposisikan hasil riset ini sebagai modul komplementer (plugin pihak ketiga).
   - Segala inovasi yang berhasil diverifikasi di lab ini (misalnya perbaikan AST compiler, mitigasi SSR template factory, maupun optimasi Vite 8) akan secara terbuka dikontribusikan kembali ke *upstream*.
3. **Pemisahan Batas yang Tegas (*Strict Demarcation*)**:
   - Aurelia **tidak bergantung** pada Hono. Inti Aurelia tetap murni, bersih, dan agnostik terhadap backend apa pun.
   - Hono **tidak bergantung** pada Aurelia. Hono tetap menjadi web framework ringan universal.
   - Hubungan keduanya hanyalah jembatan adapter tipis yang opsional.

---

## 3. Sintesis Empat Pilar: Meminjam Filosofi Lintas Ekosistem

Eksperimen ini berdiri di atas persilangan empat pilar filosofis:

```
                  ┌────────────────────────────────────────┐
                  │          AURELIA 2 CORE DNA            │
                  │ • Direct DOM (No Virtual DOM)          │
                  │ • W3C Custom Elements Native           │
                  │ • Fine-Grained Reactive Observers      │
                  └───────────────────┬────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│     SVELTE & ASTRO    │ │     QWIK HORIZON      │ │      HONO EDGE        │
│ • Single-File (.aux)  │ │ • Resumable Execution │ │ • Zero-Overhead HTTP  │
│ • Write Real HTML     │ │ • Zero-JS Initial TTI │ │ • Web Standards APIs  │
│ • Native Scoped Styles│ │ • Pointer Serialization│ │ • Universal Runtime   │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

1. **Dari Aurelia 2**: Kita meminjam arsitektur kelas murni, Dependency Injection yang tangguh, dan observasi reaktif langsung ke DOM tanpa overhead rekonsiliasi VDOM tree.
2. **Dari Svelte & Astro**: Kita meminjam mental model *"Framework as a Compiler"* dan kenyamanan menulis komponen Single-File (`.aux`) di mana HTML terasa seperti HTML biasa, bukan sintaks JSX yang dipaksakan.
3. **Dari Hono**: Kita meminjam kecepatan eksekusi HTTP berbasis standar Web APIs (`Request` / `Response`), TypeScript-first design, dan portabilitas lintas Node.js, Bun, Deno, hingga Cloudflare Workers.
4. **Dari Qwik**: Kita meminjam visi radikal tentang eliminasi siklus hidrasi ganda melalui serialisasi state dan eksekusi berbasis interaksi (*resumable execution*).

---

## 4. Tiga Lapisan Tanggung Jawab (Separation of Concerns)

Agar proyek ini tetap tangguh (*robust*) dan mudah dipelihara, kita membedah arsitektur menjadi 3 lapisan independen:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LAPISAN 1: DX & SFC COMPILER (@aureliajs/vite-plugin-aux)              │
│ Scope: Transformasi file .aux -> Aurelia CustomElementDefinition       │
│ Bebas dari: Backend server, Hono, HTTP transport, Node APIs            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAPISAN 2: AURELIA SSR & EXECUTION ENGINE (Pure Aurelia Core)          │
│ Scope: Server DOM Isolation, Template Factory, State Serialization     │
│ Bebas dari: Framework HTTP spesifik (bekerja murni dengan Request/DOM) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAPISAN 3: EDGE DELIVERY ADAPTER (@hono/aurelia)                   │
│ Scope: Jembatan tipis antara Router Hono dan Lapisan 2                 │
│ Bebas dari: Modifikasi internal Aurelia core                           │
└────────────────────────────────────────────────────────────────────────┘
```

Dengan pemisahan ini:
- Jika Anda hanya ingin membangun SPA statis, Anda cukup menggunakan **Lapisan 1**.
- Jika Anda ingin membangun SSR dengan Express atau Fastify, Anda cukup menggunakan **Lapisan 2**.
- Jika Anda ingin ekosistem fullstack dengan Hono, Anda memasang **Lapisan 3**.

---

## 5. Bedah DX: Mengapa `.aux` (Aurelia in HTML) Terasa Seperti Svelte & Astro?

Dalam konvensi lama Aurelia, membuat sebuah komponen sering kali mewajibkan pembuatan dua file terpisah: `my-card.ts` dan `my-card.html`. Untuk UI primitif kecil (seperti badge, avatar, input), hal ini memicu kelelahan navigasi berkas (*file fatigue*).

Format `.aux` menyatukan semuanya ke dalam satu berkas HTML standar:

```html
<template as-custom-element="ui-badge" bindable="variant, text">
  <span class="badge ${variant || 'default'}">
    <slot>${text}</slot>
  </span>
</template>

<script>
  import { bindable } from 'aurelia';

  export class UiBadge {
    @bindable variant = 'default';
    @bindable text = '';
  }
</script>

<style scoped>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
```

### Prinsip Utama Compiler `.aux`:
1. **W3C Custom Element Validation**: Tag name wajib memiliki tanda hubung (`-`), misalnya `ui-badge`.
2. **HTML-First Metadata**: Atribut seperti `bindable="a, b"`, `containerless`, dan `use-shadow-dom="open"` diekstrak langsung dari tag `<template>` pada saat kompilasi.
3. **TC39 Stage 3 Standard Decorators**: Tidak lagi mengandalkan flag usang `experimentalDecorators: true`. Compiler menurunkan decorator menggunakan spesifikasi resmi `2023-11`, kompatibel penuh dengan Vite 8 (Rolldown / Oxc).
4. **Zero Runtime Boilerplate**: CSS di-scope secara otomatis menggunakan atribut dataset deterministik (`data-au-[hash]`) atau Aurelia `shadowCSS`.

---

## 6. Cakrawala Resumability: Melampaui Beban Hidrasi Konvensional ala Qwik

Inilah inti dari ambisi jangka panjang proyek ini: **Mengapa kita harus terus mempertahankan siklus Hidrasi?**

### Paradoks Hidrasi Tradisional
1. Server mengeksekusi kode aplikasi dan data menjadi DOM HTML lengkap.
2. Server mengirimkan HTML tersebut ke browser (pengguna melihat tampilan visual).
3. Browser kemudian mengunduh **seluruh bundle JavaScript** aplikasi.
4. Browser **mengeksekusi ulang** seluruh pohon komponen dari atas ke bawah hanya untuk:
   - Membuat kembali memori model reaktif.
   - Memasang ulang *event listener* (`click`, `input`, `change`).
5. **Hasil**: CPU mobile panas, baterai boros, dan terjadi jeda waktu di mana tombol terlihat aktif tetapi belum bisa diklik (*hydration uncanny valley*).

```
[Hidrasi Tradisional]
Server: Run App -> Produce HTML 
Client: Download All JS -> Re-run Entire App from Scratch -> Attach Listeners
(Duplikasi kerja 100%)
```

### Paradigma Resumability (Inspirasi Qwik untuk Aurelia 2)
Di bawah konsep Resumability:
1. Server mengeksekusi aplikasi dan **menserialisasikan status internal serta penanda event listener langsung ke dalam atribut HTML**:
   ```html
   <button au-on-click="q-chunk-btn.js#handleClick" au-scope="ctx_123">
     Click Me
   </button>
   ```
2. Browser menerima HTML dan **TIDAK mengeksekusi JavaScript apa pun pada saat load**.
3. Global event listener menangkap event secara delegatif pada level `document`.
4. Saat pengguna mengklik tombol tersebut:
   - Handler membaca atribut `q-chunk-btn.js#handleClick`.
   - Browser hanya mengunduh potongan kecil fungsi handler tersebut (*micro-chunk*).
   - Eksekusi langsung dilanjutkan (*resumed*) dari memori server tanpa me-render ulang seluruh halaman.

```
[Resumability]
Server: Run App -> Serialize DOM + State + Event Pointers
Client: Instant Paint -> ZERO JS Executed on Load
Interaksi: User Klik Tombol -> Unduh 1KB Handler -> Eksekusi Selesai!
```

### Mengapa Aurelia 2 Berpotensi Menjadi Host Resumability yang Luar Biasa?
- Aurelia tidak menggunakan Virtual DOM, melainkan **AST Binding Expressions** (`Binding`, `PropertyBinding`, `ListenerBinding`).
- Template controller Aurelia (`repeat.for`, `if.bind`) sudah bekerja dengan penanda komentar native (`<!--au-->`).
- Dengan memperluas compiler `.aux` kita untuk membedah listener menjadi *dynamic import symbols*, Aurelia 2 berpotensi menjadi framework non-VDOM pertama yang mengadopsi kemampuan *resumable execution*.

---

## 7. Islands Architecture vs. Resumability: Memetakan Niche Pasar

Dalam perjalanan riset ini, kita menyadari bahwa tidak ada satu arsitektur yang cocok untuk semua kebutuhan. Keduanya memiliki nilai guna masing-masing:

| Dimensi | Islands Architecture (Astro) | Resumability (Qwik) | Aurelia 2 (Arah Lab Kita) |
| :--- | :--- | :--- | :--- |
| **Model Dasar** | HTML Statis + Pulau Interaktif terisolasi (`client:load`) | Seluruh aplikasi bersifat serializable dan resumable | Komponen murni W3C dengan opsi SPA, SSR Takeover, atau Resumable Island |
| **Beban JS Awal** | Rendah (hanya JS pulau interaktif) | Nyaris Nol (hanya tiny global event dispatcher) | Modular: Zero JS untuk halaman statis, instant takeover untuk dashboard |
| **Kompleksitas State** | Komunikasi antar pulau membutuhkan event bus / signals global | State global terkelola otomatis lewat serialisasi closure | Hierarchical DI Container bawaan Aurelia yang sangat elegan |
| **Niche Terbaik** | Content-heavy, Blog, E-commerce katalog | Large Web Apps, Portals, Public Landing Pages dengan TTI kritis | Enterprise SaaS Dashboard, Complex Multi-tenant, Real-time Operations |

Di repositori ini, kita membuktikan bahwa **Aurelia Ops Dashboard (`apps/web`)** sangat pas sebagai SPA interaktif murni, sementara modul SSR dan eksplorasi resumability disiapkan untuk kebutuhan skala besar yang membutuhkan SEO instan.

---

## 8. Panduan bagi Rekan Experimentor & Kontributor

Bagi para engineer yang tertarik untuk bergabung, menelaah, atau menguji coba kode di dalam repositori ini, berikut adalah panduan navigasi kerja:

### A. Kebijakan Kualitas Kode (Strict Engineering Standards)
Kami menolak jalan pintas yang merusak keandalan sistem. Di repositori ini berlaku aturan ketat:
- **Zero `any`**: Semua tipe data harus dimodelkan secara eksplisit menggunakan TypeScript generics atau `unknown` yang tervalidasi.
- **Zero Error Suppression**: Dilarang menggunakan `@ts-ignore`, `@ts-expect-error`, atau mengabaikan lint warnings (`oxlint --deny-warnings`).
- **Verifiable Success Criteria**: Setiap perubahan compiler atau runtime wajib dibuktikan dengan pengujian unit (`bun test` / `vitest`) dan simulasi browser runtime nyata.

### B. Struktur Direktori Kunci
- [`packages/vite-plugin-aux`](../../packages/vite-plugin-aux): Compiler resmi Single-File Component `.aux`. Tempat riset AST extraction, scoped CSS, dan decorator lowering.
- [`packages/vscode-aux`](../../packages/vscode-aux): Extension VS Code untuk sintaks, linter, analyzer, dan autocompletion `.aux`.
- [`.agents/skills`](../../.agents/skills): Agent knowledge base murni Aurelia 2 (bebas dari coupling backend).
- [`apps/shared`](../../apps/shared): Subpath contracts (`/utils` dan `/schemas`) dengan `"sideEffects": false`.
- [`packages/hono-aurelia`](../../packages/hono-aurelia): Laboratorium integrasi SSR Aurelia dengan runtime Hono.
- [`scripts/emulate-devtools.ts`](../../scripts/emulate-devtools.ts): Emulator DevTools terminal untuk memverifikasi modul, binding, dan reaktivitas DOM secara instan tanpa browser fisik.

---

## 9. Epilog: Panggilan Kolaborasi Terbuka

Rekayasa perangkat lunak bukanlah perlombaan dogma framework mana yang paling benar. Rekayasa perangkat lunak adalah seni memecahkan masalah komputasi dan memberikan pengalaman pengguna yang paling mulus (*immersive, instantaneous, and resilient*).

Kami menyambut rekan-rekan engineer, kontributor, pemerhati ekosistem Aurelia, Hono, maupun Qwik untuk mengkaji, mengkritisi, dan menyempurnakan blueprint ini.

> *"Kita meminjam filosofi terbaik dari mereka yang telah merintis jalan, bukan untuk meniru, melainkan untuk merajut sintesis baru yang memajukan ekosistem web secara bersama-sama."*

---
*Dokumen ini merupakan bagian dari inisiatif riset terbuka oleh Sandikodev (@sandikodev).*  
*Silakan ajukan Issue, Pull Request, atau diskusi arsitektur melalui repositori ini.*
