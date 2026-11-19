# Aurelia 2 & Hono: Clean Native Perfection & Phased Modernization Roadmap
**Peta Jalan Menuju Kemurnian Native, Zero-Boilerplate, dan Arsitektur Seimbang**

> **Arsitek & Pengembang Utama**: Sandikodev (`@sandikodev`)  
> **Status Dokumen**: Living Architectural Ledger & Execution Guide  
> **Versi**: 1.0.0 (November 2026)  
> **Target Ekosistem**: Bun-First, Pure Aurelia 2 SPA, Pure Hono API, Unified Fullstack SSR (`@hono/aurelia`)

---

## 1. Filosofi & Prinsip Keseimbangan (The Balance Principle)

Dalam membangun ekosistem meta-framework yang matang dan berstandar enterprise, kita memegang teguh prinsip keseimbangan:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE BALANCE TRIANGLE                            │
│                                                                        │
│                [1] Enterprise Purity (Aurelia 2)                       │
│                    - Spring Boot / .NET DI backbone                    │
│                    - Pure .ts + .html SPA di apps/web                  │
│                    - Dekopel tegas dari backend                        │
│                                  ▲                                     │
│                                 / \                                    │
│                                /   \                                   │
│                               /     \                                  │
│                              /       \                                 │
│                             ▼         ▼                                │
│        [2] Modern Velocity               [3] Unified Ergonomics        │
│            (Bun-First Engine)                (.aux SFC + @hono/aurelia)│
│            - Native TypeScript execution     - DX seperti Svelte/Astro │
│            - Sub-millisecond Bun.build       - Zero-glue SSR adapter   │
│            - Instant bun test suite          - Co-located loaders      │
└────────────────────────────────────────────────────────────────────────┘
```

### Batasan Arsitektural yang Tidak Boleh Dilanggar:
1. **`apps/web`**: Tetap sebagai **Pure Canonical Aurelia 2 SPA** (`.ts` + `.html`, native `@customElement`, `@route`, standard DI). **Jangan** dipaksa migrasi ke `.aux` pada halaman lamannya, dan **jangan** disatukan dengan `apps/api`.
2. **`apps/api`**: Tetap sebagai **Pure Standalone Hono Backend** (API routes, Drizzle ORM, multi-tenant middleware).
3. **`examples/fullstack-ssr`**: Satu-satunya showcase untuk unifikasi Hono + Aurelia SSR via `@hono/aurelia` dan `.aux` SFCs.
4. **Semua perubahan harus bertahap, terukur, dan dapat diulang (*repeatable*)** tanpa merusak backward compatibility atau stabilitas core Aurelia.

---

## 2. Matriks Diagnosis: 7 Vektor "Dirty / Hybrid" Codebase

Berdasarkan audit forensik menyeluruh, berikut adalah 7 titik yang belum murni native dan menimbulkan friksi:

| No | Vektor Masalah | Lokasi Kode Terdampak | Status Saat Ini | Masalah & Dampak |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Zombi Vitest** | `apps/web/package.json`<br>`apps/api/package.json`<br>`packages/shared/package.json`<br>`packages/aurelia-ssr/package.json`<br>`packages/vite-plugin-aux/package.json` | Memasang `vitest: 5.1.0` (fiktif) dan `"test": "vitest run"` | Paket `vitest` sebenarnya tidak terpasang. Konfigurasi `vitest.config.ts` menjadi zombi, sementara `bun test` sudah mampu menjalankan semua 21 file (212 test) dalam 2.4 detik. |
| **2** | **Toolchain Duality (tsx vs Bun)** | `apps/api/package.json`<br>`examples/fullstack-ssr/package.json` | Menggunakan `tsx watch src/index.ts` dan dependensi `tsx` | Bun secara native mengeksekusi TypeScript secara instan. Keberadaan `tsx` menambah dependensi eksternal yang tidak diperlukan. |
| **3** | **Wrapper Server Node.js** | `apps/api/src/index.ts`<br>`apps/api/src/server.ts`<br>`packages/ssr-playground/package.json` | Memanggil `serve` dari `@hono/node-server` | Di lingkungan Bun, Hono berjalan 100% native via `export default { fetch: app.fetch }`. `@hono/node-server` adalah pembungkus Node.js yang memperlambat I/O Bun. |
| **4** | **Fragmentasi Monorepo Workspaces** | `package.json` (Root) | Hanya mendaftarkan sebagian paket: `apps/*`, `packages/shared`, dll. | `packages/hono-aurelia`, `packages/aurelia-islands`, dan `examples/*` tidak terdaftar. Menghasilkan triple lockfile (`pnpm-lock.yaml`, child `bun.lock`, child `pnpm-lock.yaml`). |
| **5** | **Path Traversal Rapuh** | `scripts/emulate-devtools.ts`<br>`apps/web/vite.config.ts` | Mengimpor dari `../node_modules/.pnpm/jsdom@23.2.0/...` dan `../../packages/shared/src/...` | Brittle. Jika hoisting package manager berubah, script devtools langsung patah. |
| **6** | **JSDOM & Concurrency Lock di SSR** | `packages/aurelia-ssr/src/render.ts` | `import { JSDOM } from 'jsdom'`, `RenderMutex` FIFO lock | JSDOM berat (20+ transitive deps). Mengubah `globalThis` dan memaksa `RenderMutex` untuk serialisasi request SSR, membunuh konkurensi multi-request. |
| **7** | **Artefak Asing (Alien Submodule)** | `examples/hono-react-ssr-shadcn-ui/` | Submodule git mandiri React 18 + Shadcn UI | Membingungkan pengembang karena berada di folder `examples/` dalam repositori resmi Aurelia 2. |

---

## 3. Peta Jalan Eksekusi Bertahap (Phased Roadmap)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASED ROADMAP EXECUTION PIPELINE                    │
│                                                                        │
│ [FASE 1] Zero-Risk Hygiene: Pembersihan Vitest & Zombi Configs [SELESAI]│
│          └─ Target: Standardisasi 100% ke bun test                     │
│                                                                        │
│ [FASE 2] Workspace & Lockfile Consolidation                    [SELESAI]│
│          └─ Target: 1 Root Workspace, 1 Lockfile, no deep path traversal│
│                                                                        │
│ [FASE 3] Pure Bun-Native Toolchain & HTTP Server               [SELESAI]│
│          └─ Target: Drop tsx, native export default { fetch }          │
│                                                                        │
│ [FASE 4] Isolasi Artefak Referensi                             [SELESAI]│
│          └─ Target: Rapikan examples/hono-react-ssr-shadcn-ui          │
│                                                                        │
│ [FASE 5] Deep SSR Evolution: Scoped Platform & Anti-Mutex     [SELESAI]│
│          └─ Target: Scoped IPlatform + AsyncLocalStorage tanpa Mutex   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Fase 1: Zero-Risk Hygiene & Test Runner Unification (Status: Selesai ✅)
**Tujuan**: Menghilangkan seluruh zombi Vitest dan menstandarkan eksekusi test runner ke `bun test` di seluruh paket tanpa mengubah fungsionalitas bisnis.

* [x] **Langkah 1.1**: Bersihkan `package.json` di `apps/web`, `apps/api`, `packages/shared`, `packages/aurelia-ssr`, `packages/vite-plugin-aux`, `packages/vscode-aux`, `packages/ssr-playground`, `packages/hono-aurelia`:
  - Ubah `"test": "vitest run"` menjadi `"test": "bun test"`.
  - Hapus dependensi `"vitest": "5.1.0"` dari `devDependencies`.
* [x] **Langkah 1.2**: Hapus file konfigurasi zombi:
  - `packages/aurelia-ssr/vitest.config.ts`
  - `packages/hono-aurelia/vitest.config.ts`
* [x] **Langkah 1.3**: Di root `package.json`, standarkan script:
  ```json
  "scripts": {
    "test": "bun test packages/ apps/ examples/",
    "test:coverage": "bun test --coverage"
  }
  ```
* [x] **Verifikasi**: Jalankan `bun test` dari root. Pastikan **222/222 tests pass (0 fail)**.

---

### Fase 2: Monorepo Workspace & Lockfile Consolidation (Status: Selesai ✅)
**Tujuan**: Menyatukan seluruh paket dan contoh ke dalam satu tata kelola workspace yang bersih dan konsisten.

* [x] **Langkah 2.1**: Update `workspaces` pada root [`package.json`](file:///home/dev/project/aureliajs/package.json) dan [`pnpm-workspace.yaml`](file:///home/dev/project/aureliajs/pnpm-workspace.yaml):
  ```json
  "workspaces": [
    "apps/*",
    "packages/*",
    "examples/*"
  ]
  ```
* [x] **Langkah 2.2**: Hapus lockfile terisolasi di anak folder:
  - Hapus `examples/fullstack-ssr/pnpm-lock.yaml`.
  - Hapus `packages/ssr-playground/bun.lock` (satukan ke root).
  - Ganti seluruh `link:../` di `examples/fullstack-ssr/package.json` dan `packages/ssr-playground/package.json` menjadi `workspace:*`.
* [x] **Langkah 2.3**: Perbaiki resolusi di [`apps/web/vite.config.ts`](file:///home/dev/project/aureliajs/apps/web/vite.config.ts):
  - Ganti `import { auxPlugin } from '../../packages/vite-plugin-aux/dist/index.js'` menjadi `import { auxPlugin } from '@aureliajs/vite-plugin-aux'`.
  - Hapus alias manual ke file `.ts` internal, gunakan package exports resmi.
* [x] **Langkah 2.4**: Refaktor [`scripts/emulate-devtools.ts`](file:///home/dev/project/aureliajs/scripts/emulate-devtools.ts):
  - Ganti deep path traversal (`../node_modules/.pnpm/...`) menjadi import package standar (`import { JSDOM } from 'jsdom'`, `@aurelia/platform-browser`, etc.).
* [x] **Verifikasi**: Jalankan `bun x oxlint` (0 warning, 0 error), `bun run test` (222/222 pass), dan `bun scripts/emulate-devtools.ts` (0 warning, 0 error).

---

### Fase 3: Pure Bun-Native Toolchain & HTTP Server (Status: Selesai ✅)
**Tujuan**: Menghilangkan wrapper Node.js (`tsx`, `@hono/node-server`) pada aplikasi yang dijalankan di Bun.

* [x] **Langkah 3.1**: Di [`apps/api/package.json`](file:///home/dev/project/aureliajs/apps/api/package.json):
  - Ubah `"dev": "tsx watch src/index.ts"` menjadi `"dev": "bun --watch src/index.ts"`.
  - Ubah `"db:migrate": "tsx src/db/migrate.ts"` menjadi `"db:migrate": "bun src/db/migrate.ts"`.
  - Ubah `"db:seed": "tsx src/db/seed.ts"` menjadi `"db:seed": "bun src/db/seed.ts"`.
  - Hapus dependensi `"tsx"`.
* [x] **Langkah 3.2**: Sederhanakan HTTP entrypoint `apps/api/src/index.ts`:
  ```typescript
  import { app } from './app.js';
  import { env } from './env.js';

  const isBun = 'bun' in process.versions;

  if (!isBun) {
    const { serve } = await import('@hono/node-server');
    serve({ fetch: app.fetch, port: env.PORT }, (info) => {
      console.log(`[api] listening on http://localhost:${info.port} (${env.NODE_ENV})`);
    });
  } else {
    console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV}) via Bun`);
  }

  export default {
    port: env.PORT,
    fetch: app.fetch,
  };
  ```
  *(Native Bun HTTP server dengan dynamic fallback `@hono/node-server` untuk container Node.js).*
* [x] **Langkah 3.3**: Di `examples/fullstack-ssr/package.json`:
  - Hapus dependensi `tsx`.
* [x] **Verifikasi**: Uji boot server `PORT=4999 bun apps/api/src/index.ts` dan `PORT=3001 bun examples/fullstack-ssr/src/index.ts` berhasil start secara native.

---

### Fase 4: Repositori & Reference Hygiene (Status: Selesai ✅)
**Tujuan**: Menjaga identitas monorepo agar 100% merepresentasikan ekosistem Aurelia 2.

* [x] **Langkah 4.1**: Pindahkan benchmark komparatif `examples/hono-react-ssr-shadcn-ui` ke folder khusus `benchmarks/reference-react-ssr/` agar jelas fungsinya sebagai pembanding performa dan tidak mengotori workspace Aurelia.
* [x] **Langkah 4.2**: Perbarui `examples/README.md` untuk menegaskan bahwa `examples/fullstack-ssr` adalah satu-satunya referensi kanonikal resmi untuk `@hono/aurelia`.
* [x] **Verifikasi**: Struktur direktori `examples/` hanya berisi implementasi murni Aurelia 2 (`examples/fullstack-ssr`).

---

### Fase 5: Deep SSR Engine Evolution (Status: Selesai ✅)
**Tujuan**: Menghilangkan bottleneck `RenderMutex` FIFO lock dan mutasi `globalThis` pada Server-Side Rendering Aurelia 2.

* [x] **Langkah 5.1**: Scoped `IPlatform` Aurelia 2 DI Container:
  - Mengonfigurasi Aurelia runtime untuk menerima instans `IPlatform` terisolasi (`new BrowserPlatform(win)`) di dalam request container (`const container = DI.createContainer(); const app = new Aurelia(container);`).
  - Mengeliminasi ketergantungan singleton `PLATFORM` Aurelia 1 legacy.
* [x] **Langkah 5.2**: Eliminasi Total Mutex Lock (`RenderMutex` Purged):
  - Menghapus class `RenderMutex` dan pemanggilan `renderMutex.acquire()`.
  - SSR Aurelia 2 kini melayani request secara konkurensi paralel murni (true non-blocking concurrency) tanpa antrean FIFO.
* [x] **Langkah 5.3**: Zero Global Mutation via `AsyncLocalStorage`:
  - Mengganti mutasi destruktif `syncDomEnvironment` / `restoreEnvironment` dengan `AsyncLocalStorage` native Node/Bun.
  - Global `window` dan `document` kini disajikan secara dinamis dan aman per async context request, mencegah cross-request pollution dan race condition.
* [x] **Verifikasi**: Stress test konkurensi 30+ request simultan (`headless-diagnostics.test.ts` & `render.test.ts`) lolos 100% tanpa AUR0757 dan memori stabil.

---

## 4. Perintah Verifikasi Rutin (Developer Hygiene Quick-Check)

Kapan pun Sandikodev ingin memverifikasi kebersihan codebase setelah melakukan iterasi, cukup jalankan urutan perintah berikut:

```bash
# 1. Verifikasi Linting & Zero-Tolerance Code Quality
bun x oxlint

# 2. Verifikasi Seluruh Unit & Integration Test Suite (Semua Paket)
bun test

# 3. Verifikasi Build Paket Inti
cd packages/aurelia-ssr && bun run build
cd ../vite-plugin-aux && bun run build
cd ../hono-aurelia && bun run build
cd ../ssr-playground && bun run build

# 4. Verifikasi Standalone Fullstack Example
cd examples/fullstack-ssr && bun test
```

---

## 5. Lembar Rekam Jejak (Living Progress Ledger)

| Tanggal | Fase | Aksi yang Dijalankan | Hasil / Catatan | Petugas |
| :--- | :--- | :--- | :--- | :--- |
| **2026-11-17** | **Inisiasi** | Penyusunan Master Manifesto & Analisis Forensik 7 Vektor | Roadmap disahkan; Baseline green tests; Playground focus ring fixed. | Sandikodev |
| **2026-11-18** | **Fase 1** | Pembersihan zombi Vitest & standardisasi `bun test` di semua package | Selesai (oxlint clean; vitest & config zombi dihapus). | Sandikodev |
| **2026-11-18** | **Fase 2** | Konsolidasi workspace root & penghapusan lockfile ganda | Selesai: 1 Root Workspace (`bun.lock`), hapus pnpm-lock & child bun.lock. | Sandikodev |
| **2026-11-18** | **Fase 3** | Pembersihan `tsx` & aktivasi native Bun HTTP server di `apps/api` | Selesai: Zero external runner; native Bun execution via `export default { fetch }`. | Sandikodev |
| **2026-11-18** | **Fase 4** | Perapian folder `examples/` dari artefak React benchmark | Selesai: Relokasi ke `benchmarks/reference-react-ssr/` di luar workspace. | Sandikodev |
| **2026-11-18** | **Fase 5** | Scoped `IPlatform` & AsyncLocalStorage tanpa Mutex | Selesai: Eliminasi `RenderMutex`, concurrent SSR 30+ req/s zero state leak. | Sandikodev |
| **2026-11-19** | **Fase 6** | Pemisahan Scaffold Komunitas Mandiri via `git mv` | Selesai: 5 contoh terisolasi (`fullstack-ssr`, `aurelia-islands`, `aurelia-aux`, `aurelia-bridge`, `aurelia-ssr`). Type assertions `as unknown as string` tereliminasi 100%. | Sandikodev |
| **2026-11-19** | **Fase 7** | Native E2E Hardening & Isolasi Playwright `.e2e.ts` | Selesai: Playwright specs dipisah ke `*.e2e.ts`. `bun test` mengeksekusi 142 unit/integration tests monorepo secara instan tanpa collision. | Sandikodev |
| **2026-11-20** | **Fase 8** | Eliminasi Skrip Build Userland & Pembersihan Impor Ekstensi `.js` | Selesai: Seluruh folder `scripts/` di 5 example dihapus 100%. Impor .js dibersihkan menjadi native extensionless. UI/UX mobile-first responsive. 158 tests passing. | Sandikodev |
| **2026-11-20** | **Fase 9** | Cloudflare Workers Parity & Cross-DOM (LinkeDOM) Hardening | Selesai: `wrangler.toml` terintegrasi dengan `@hono/aurelia/build`. LinkeDOM attribute mangling dieliminasi dengan clean `getCategoryClass` helper. Eksekusi worker.js terverifikasi 100% 200 OK. | Sandikodev |

---

*Dokumen ini dirancang untuk dapat dibuka, diupdate, dan dikerjakan ulang sewaktu-waktu sebagai panduan teknis menjaga kebersihan arsitektural proyek.*
