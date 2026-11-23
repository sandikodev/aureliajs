# 📚 Aurelia 2 Ecosystem — Documentation & Architecture Index

> **Arsitek & Penulis**: Sandikodev (@sandikodev)  
> **Terakhir Diperbarui**: 2026-11-23  
> **Repositori**: `/home/dev/project/aureliajs`

Repositori ini adalah pusat inovasi rekayasa perangkat lunak Aurelia 2: menggabungkan kecepatan **Direct-DOM** murni, arsitektur enterprise berbasis **IoC & Dependency Injection**, runtime **Hono Edge Fullstack SSR**, format **`.aux` Single-File Components**, serta suite **Agnostic Bridge & Selective Hydration Islands**.

Dokumen ini berfungsi sebagai peta navigasi (*Single Source of Truth*) agar seluruh kontributor, pengembang, dan arsitek memahami hirarki, batasan, dan evolusi setiap dokumen di dalam direktori `docs/`.

---

## 🗺️ Peta Navigasi Hierarki Dokumentasi

```
docs/
├── [Tier 1] Master Architectural Blueprint (Active SSOT)
│   └── ARCHITECTURAL-STUDY.md                     # Cetak biru 4-Tier Decoupled Suite (@aureliajs/bridge, islands, ssr, @hono/aurelia)
│
├── [Tier 2] Reform Roadmap & Engineering Manifestos
│   ├── AURELIA_CLEAN_NATIVE_ROADMAP.md            # 21 Fase refaktorisasi 100% hijau, zero userland build script
│   ├── AURELIA_REFORM_AND_DISCIPLINE_MANIFESTO.md # Manifesto reformasi & penolakan alasan niche enterprise
│   └── AURELIA_HONO_MASTER_MANIFESTO.md           # Manifesto penyatuan Aurelia 2 + Hono Web Standards
│
├── [Tier 3] Production SaaS Reference Architecture (Aurelia Ops)
│   ├── architecture.md                            # Spesifikasi teknis SaaS multi-tenant: Session auth, DB, Stripe
│   ├── case-study.md                              # Studi kasus migrasi, audit tenant seam, dan testing
│   └── EXAMPLES.md                                # Panduan implementasi contoh di setiap package
│
├── [Tier 4] Theoretical Foundations & Philosophy (Cikal Bakal Kursus)
│   └── essays/
│       ├── the-reactive-continuum.md                  # Spektrum reaktivitas: VDOM vs Signals vs Compiler vs Direct-DOM
│       ├── the-angular-aurelia-heritage.md            # Sejarah Rob Eisenberg, Google 2014, dan semantik kelas
│       ├── the-resumable-frontier.md                  # Resumability Qwik vs Islands vs Hydration
│       ├── the-javascript-fallacy.md                  # Paradoks substrate web: 10 hari JS, ilusi TS, dan sistem modern
│       └── upwork-strategy.md                         # Analisis pasar global Upwork & strategi niche karier
│
└── [Tier 5] Archive (Historical Proposals)
    └── archive/                                   # Proposal lama (termasuk routing refactor)
│
├── [Tier 6] Active RFCs (status per 2026-11-23)
    └── .github/issues/0*.md                       # RFC Argon2 (implemented), jsdom→linkedom (partial), dll.
                                                   # Cek field **Status:** tiap file sebelum mengutipnya.
```

---

## 🏛️ Tingkat 1: Master Architectural Blueprint (Active SSOT)

* Dokumen: **[`ARCHITECTURAL-STUDY.md`](ARCHITECTURAL-STUDY.md)** (Nov 21, 2026)
* **Status**: **ACTIVE — SINGLE SOURCE OF TRUTH**
* **Cakupan**:
  Menetapkan pemisahan tegas model 4-Tier Decoupled Architecture:
  1. **`@aureliajs/bridge` (WHAT)**: Dedicated Custom Elements (`<au-react>`, `<au-vue>`, `<au-svelte>`, `<au-solid>`, `<au-preact>`, `<au-qwik>`, `<au-lit>`) dan `au-htmx` untuk mengintegrasikan runtime pihak ketiga.
  2. **`@aureliajs/islands` (WHEN)**: Template controller selektif berbasis Aurelia Synthetic Views (`island="visible"`, `island="idle"`, `island="interaction"`, `island="media"`).
  3. **`@aureliajs/ssr` (WHERE)**: Headless server rendering engine yang request-scoped, zero-leak pada `globalThis`, dan bebas bottleneck `RenderMutex`.
  4. **`@hono/aurelia` (HOW)**: Adaptor HTTP modern untuk Edge dan Node.js, streaming Web Streams, Server Actions, dan subpath export `@hono/aurelia/client`.

---

## 📜 Tingkat 2: Reform Roadmap & Engineering Manifestos

* **[`AURELIA_CLEAN_NATIVE_ROADMAP.md`](AURELIA_CLEAN_NATIVE_ROADMAP.md)**:
  Mendokumentasikan 21 fase eksekusi disiplin rekayasa yang telah 100% selesai dan terverifikasi hijau (zero mock testing, zero runtime hacks, true isolated execution).
* **[`AURELIA_REFORM_AND_DISCIPLINE_MANIFESTO.md`](AURELIA_REFORM_AND_DISCIPLINE_MANIFESTO.md)**:
  Manifesto yang menolak mentalitas "Aurelia itu niche enterprise jadi wajar kalau tooling-nya tertinggal". Menegakkan standar web modern, zero boilerplate, dan kebersihan API.
* **[`AURELIA_HONO_MASTER_MANIFESTO.md`](AURELIA_HONO_MASTER_MANIFESTO.md)**:
  Manifesto awal penggabungan Aurelia 2 Direct-DOM dengan ekosistem Hono Web Standards.

---

## 🏢 Tingkat 3: Arsitektur Referensi SaaS Production (`Aurelia Ops`)

* **[`architecture.md`](architecture.md)**:
  Dokumen spesifikasi arsitektur aplikasi SaaS multi-tenant di folder `apps/`:
  - `apps/web`: SPA Aurelia 2 dengan Tailwind CSS 4 dan komponen UI berbasis class.
  - `apps/api`: REST API Hono dengan Argon2id session auth, PostgreSQL, Drizzle ORM, dan Stripe billing.
  - `apps/shared`: Kontrak tipe Zod dan DTO bersama.
* **[`case-study.md`](case-study.md)**:
  Studi kasus dunia nyata mengenai pemisahan *Tenant Seam* (`apps/api/src/middleware/tenant.ts`), penanganan multi-tenancy, dan pengujian end-to-end.
* **[`EXAMPLES.md`](EXAMPLES.md)**:
  Panduan praktis untuk menjalankan seluruh contoh di `packages/*/example`.

---

## 💡 Tingkat 4: Fondasi Filosofis & Teoretis (`essays/`)

Dokumen-dokumen ini adalah kumpulan esai filosofis yang ditulis oleh Sandikodev dan disimpan di dalam folder [`docs/essays/`](essays/). Esai-esai ini menjadi cikal bakal kurikulum buku **Evolusi Web** (`course/evolusi-web`) dan **Course Aurelia 2** (`course/aureliajs`):

1. **[`the-reactive-continuum.md`](essays/the-reactive-continuum.md)**: Bedah spektrum reaktivitas (Virtual DOM vs Proxy vs Signals vs Compiler vs Direct-DOM).
2. **[`the-angular-aurelia-heritage.md`](essays/the-angular-aurelia-heritage.md)**: Sejarah Rob Eisenberg keluar dari tim Google Angular 2 (2014) untuk membangun Aurelia.
3. **[`the-resumable-frontier.md`](essays/the-resumable-frontier.md)**: Eksplorasi konsep Resumability Qwik dan perbandingannya dengan selective hydration.
4. **[`the-javascript-fallacy.md`](essays/the-javascript-fallacy.md)**: Telaah kritis terhadap platform JavaScript dan ilusi keamanan TypeScript statis.
5. **[`upwork-strategy.md`](essays/upwork-strategy.md)**: Panduan strategi karier global dan peluang freelance di pasar Upwork.

---

## 🗄️ Tingkat 5: Arsip Proposal (`archive/`)

Folder [`archive/`](archive/) memuat dokumen RFC, proposal historis, dan rencana transisi yang telah selesai diimplementasikan atau digantikan oleh arsitektur yang lebih matang, termasuk:
* `ROUTING_REFACTOR_PROPOSAL.md` (proposal refaktorisasi routing awal)
* Berbagai catatan audit dan dokumen POC fase awal (13–17 November 2026).

---

*Setiap pembaruan keputusan arsitektur harus tercermin pada dokumen Tingkat 1 ([`ARCHITECTURAL-STUDY.md`](ARCHITECTURAL-STUDY.md)) dan dicatat dalam changelog monorepo.*
