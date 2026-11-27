# Prosedur Kontribusi & Etika Upstream `aurelia/aurelia`

Dokumen ini memetakan tata kelola, alur teknis, konvensi repositori, aktivitas PR/issue terkini, serta *ethical contribution playbook* untuk berkontribusi ke repositori upstream [`aurelia/aurelia`](https://github.com/aurelia/aurelia) berdasarkan audit langsung terhadap submodule `packages/upstream/aurelia` dan metadata GitHub API (`gh`).

---

## 1. Status Fork & Guard Konfigurasi Monorepo Lokal

Sebagai prasyarat riset dan persiapan kontribusi upstream, fork dan submodule telah disiapkan di workspace ini tanpa mengubah *dependency graph* atau *test suite* milik `aureliajs`:

- **Fork GitHub**: [`sandikodev/aurelia`](https://github.com/sandikodev/aurelia) (fork dari [`aurelia/aurelia`](https://github.com/aurelia/aurelia), *default branch*: `master`).
- **Submodule lokal**: [`packages/upstream/aurelia`](file:///home/dev/project/aureliajs/packages/upstream/aurelia) terdaftar di [`.gitmodules`](file:///home/dev/project/aureliajs/.gitmodules#L19-L21) dengan remote `origin` (`git@github.com:sandikodev/aurelia.git`) dan `upstream` (`https://github.com/aurelia/aurelia.git`), berada pada branch `master`.
- **Guard linter**: [`packages/upstream/**` ditambahkan ke `.oxlintignore`](file:///home/dev/project/aureliajs/.oxlintignore#L10) agar `bun run lint` (`oxlint`) tidak memindai kode upstream.
- **Guard test runner**: [`pathIgnorePatterns = ["packages/upstream/**"]` ditambahkan di `bunfig.toml`](file:///home/dev/project/aureliajs/bunfig.toml#L4-L6) di bawah `[test]` (didukung oleh flag `--path-ignore-patterns` Bun 1.4.4) sehingga root `bun test` tetap hanya menjalankan 275 test di 41 file.
- **Guard workspace/lockfile**: [`package.json`](file:///home/dev/project/aureliajs/package.json#L55-L59) mendefinisikan `workspaces` sebagai `apps/*`, `packages/*`, dan `packages/*/example`; direktori `packages/upstream` tidak memiliki `package.json`, sehingga `bun install --frozen-lockfile --dry-run` tidak memperlakukan `packages/upstream/aurelia` sebagai workspace dan `bun.lock` tetap tidak berubah.

---

## 2. Dokumen Tata Kelola, Lisensi, dan Keamanan

| Aspek | Sumber Bukti di Submodule & URL | Ringkasan Ketentuan |
| --- | --- | --- |
| **Entry Point Kontribusi** | [`CONTRIBUTING.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/CONTRIBUTING.md) | Mengarahkan kontributor ke [dokumentasi resmi](https://docs.aurelia.io/community-contribution/joining-the-community) dan melarang laporan kerentanan keamanan di issue publik. |
| **Contributor Guide Lengkap** | [`docs/CONTRIBUTING.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/CONTRIBUTING.md) & [`docs/user-docs/community-contribution/contributor-guide.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/contributor-guide.md) | Menjelaskan alur bug report, feature request, RFC untuk major changes, git workflow, coding rules, commit convention, Changeset, dan CLA. |
| **Code of Conduct** | [`docs/CODE_OF_CONDUCT.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/CODE_OF_CONDUCT.md) & [`docs/user-docs/community-contribution/code-of-conduct.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/code-of-conduct.md) | Menuntut komunikasi konstruktif dan profesional di seluruh kanal Aurelia; pelanggaran dilaporkan ke `conduct@bluespire.com`. |
| **Lisensi** | [`LICENSE`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/LICENSE) & [`package.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/package.json#L71) | **MIT License** (Copyright 2010–2020 Blue Spire Inc.). |
| **Security Policy** | [`SECURITY.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/SECURITY.md) | Pelaporan privat melalui [GitHub Security Advisories](https://github.com/aurelia/aurelia/security/advisories); hanya release line Aurelia 2 terbaru yang didukung penuh; target respons awal 7 hari. |
| **CODEOWNERS** | Tidak ditemukan di root maupun `.github/` | Tidak ada file `CODEOWNERS` di [`packages/upstream/aurelia`](file:///home/dev/project/aureliajs/packages/upstream/aurelia) atau [`.github/`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github). |
| **Panduan AI & Agent** | [`AGENTS.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/AGENTS.md), [`CLAUDE.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/CLAUDE.md), [`docs/user-docs/developer-guides/developing-with-ai.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/developer-guides/developing-with-ai.md) | Menegaskan disiplin verifikasi langsung (*run relevant build and test commands*), larangan *hand-waving*, pemakaian `/** @internal */` untuk properti `_prefixed`, efisiensi alokasi di *hot paths*, dan pengecualian *docs-only*. |

---

## 3. Template Issue, Template PR, dan Proses Proposal / RFC

### A. Template di `.github/`

1. **Issue Templates** ([`.github/ISSUE_TEMPLATE/`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE)):
   - [`bug_report.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE/bug_report.md) — menyertakan tautan repro StackBlitz (*with/without convention*), Expected vs Current Behavior, Possible Solution, Context, Code Sample, dan tabel Environment.
   - [`feature_request.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE/feature_request.md) — untuk usulan fitur baru beserta contoh penggunaan.
   - [`rfc.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE/rfc.md) — **Request For Comment (RFC)** untuk diskusi arsitektur/fitur besar.
   - [`documentation.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE/documentation.md) — laporan ketidakakuratan atau kekurangan dokumentasi.
   - Fallback umum: [`.github/ISSUE_TEMPLATE.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE.md).

2. **Pull Request Templates** ([`.github/PULL_REQUEST_TEMPLATE/`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/PULL_REQUEST_TEMPLATE)):
   - [`bug_fix.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/PULL_REQUEST_TEMPLATE/bug_fix.md) — Description, Linked Issues, Your Solution, Reviewer Notes, Test Plan, checklist Changeset (`npx changeset`, pilih `aurelia`, bump `patch`), Next Steps, Environment.
   - [`feature.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/PULL_REQUEST_TEMPLATE/feature.md) — Description, Linked Issues, Reviewer Notes, Test Plan, checklist Changeset (bump `minor`), Next Steps.
   - [`documentation.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/PULL_REQUEST_TEMPLATE/documentation.md) — Description, Linked Issues, Reviewer Notes (tanpa changeset).
   - Default PR template: [`.github/PULL_REQUEST_TEMPLATE.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/PULL_REQUEST_TEMPLATE.md).

### B. Mekanisme Proposal: Issues vs Discussions vs Discord/Discourse

Berdasarkan [`docs/user-docs/community-contribution/contributor-guide.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/contributor-guide.md#L19-L35) dan [`joining-the-community.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/joining-the-community.md#L9-L13):

- **GitHub Issues (RFC)** — jalur resmi untuk **Major Changes** sebelum menulis kode/PR besar. Template [`rfc.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/ISSUE_TEMPLATE/rfc.md) dan label `RFC` (*"Request For Comment - Potential enhancement that needs discussion and/or requires experimentation"*) digunakan secara aktif di `aurelia/aurelia` (contoh open RFC: [#2537](https://github.com/aurelia/aurelia/issues/2537), [#2497](https://github.com/aurelia/aurelia/issues/2497), [#2256](https://github.com/aurelia/aurelia/issues/2256), [#2199](https://github.com/aurelia/aurelia/issues/2199), [#328](https://github.com/aurelia/aurelia/issues/328)).
- **GitHub Discussions** (`https://github.com/aurelia/aurelia/discussions`) — dipakai untuk *Q&A*, *Ideas*, *Show and tell* ekosistem/plugin (mis. [#2276](https://github.com/aurelia/aurelia/discussions/2276), [#2196](https://github.com/aurelia/aurelia/discussions/2196), [#2065](https://github.com/aurelia/aurelia/discussions/2065)), dan pengumuman rilis lama.
- **Discord** (`https://discord.gg/RBtyM6u`) & **Discourse** (`https://discourse.aurelia.io/`) — untuk pertanyaan penggunaan, diskusi cepat *real-time*, dan koordinasi komunitas sebelum/sesudah membuka RFC Issue.

---

## 4. Branch Target, Commit Convention, Changeset, dan CLA/DCO

### A. Branch Target & Git Workflow

- **Target branch**: **`master`** (ditegaskan oleh `defaultBranchRef` di [`aurelia/aurelia`](https://github.com/aurelia/aurelia) dan [`sandikodev/aurelia`](https://github.com/sandikodev/aurelia), [`baseBranch: "master"` di `.changeset/config.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.changeset/config.json#L11), [`contributor-guide.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/contributor-guide.md#L54), serta [`release.yml`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/workflows/release.yml#L133)).
- Saat ada revisi PR, kontributor diminta memperbarui branch dengan `git rebase master -i` dan `git push -f`, serta tidak meninggalkan commit campuran antara dua fitur/fix berbeda ([`docs/CONTRIBUTING.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/CONTRIBUTING.md#L86-L91)).

### B. Commit Convention (Conventional Commits + Commitlint + Husky)

- Hook [`.husky/commit-msg`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.husky/commit-msg) menjalankan `npx --no -- commitlint --edit`.
- Hook [`.husky/pre-commit`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.husky/pre-commit) menjalankan `git reset --quiet -- packages/__tests__/tsconfig.json`.
- Aturan [`commitlint` di `package.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/package.json#L158-L224) mewajibkan format `type(scope): subject` dengan:
  - `type-enum`: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test` (`lower-case`).
  - `scope-case`: `lower-case` (merujuk ke nama package npm seperti `runtime-html`, `router`, `vite-plugin`, `template-compiler`, atau `all`).
  - `header-max-length`: **100 karakter**.
  - `subject-case`: dilarang `sentence-case`, `start-case`, `pascal-case`, `upper-case` (harus huruf kecil di awal, *imperative present tense*).
  - `subject-full-stop`: dilarang diakhiri titik (`.`).
  - `docs/CONTRIBUTING.md` menegaskan bahwa `feat` dan `fix` harus terisolasi per commit.

### C. Changesets & Release State (`2.0.0-rc.2`)

- Versi root monorepo di [`package.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/package.json#L4) adalah **`2.0.0-rc.2`**.
- [`.changeset/pre.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.changeset/pre.json#L1-L3) berada dalam mode `"mode": "pre"` dengan tag `"rc"`.
- [`.changeset/config.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.changeset/config.json#L13-L48) mengonfigurasi **fixed versioning** untuk seluruh 32 package (`aurelia`, `@aurelia/*`, dan `@aurelia/*` tooling).
- Untuk PR yang mengubah kode package yang dipublish (`feat`, `fix`, `perf`, `refactor`), kontributor wajib menjalankan `npx changeset` (memilih `aurelia`, menentukan `patch`/`minor`/`major`, dan menuliskan ringkasan) lalu meng-commit file `.changeset/*.md`. Perubahan *docs-only*, *test-only*, `examples/`, `__e2e__/`, dan `benchmarks/` tidak memerlukan changeset ([`contributor-guide.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/contributor-guide.md#L67-L80)).

### D. CLA / DCO

- **CLA (Contributor License Agreement)**: [`docs/CONTRIBUTING.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/CONTRIBUTING.md#L93) (serta baris 194–196) dan [`contributor-guide.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/contributor-guide.md#L106) menyatakan bahwa kontributor pertama kali akan diminta menandatangani CLA melalui GitHub PR checks sebelum PR dapat diterima (naskah CLA: [gist EisenbergEffect](https://gist.github.com/EisenbergEffect/fda70f8bf335118dd4fb84ee6d49e64a)).
- **DCO**: Tidak ada aturan atau hook DCO (`Signed-off-by`) di `.husky/`, `.github/workflows/`, maupun `CONTRIBUTING`.
- **Observasi faktual pada PR terbaru**: Pada inspeksi `statusCheckRollup` PR eksternal terbuka [`#2555`](https://github.com/aurelia/aurelia/pull/2555) maupun PR maintainer [`#2584`](https://github.com/aurelia/aurelia/pull/2584) dan [`#2563`](https://github.com/aurelia/aurelia/pull/2563), tidak tampak check CLA bot yang tercatat di rollup saat ini. Meskipun demikian, aturan tertulis di dokumentasi resmi masih mencantumkan CLA, sehingga kita harus siap menandatanganinya bila prompt CLA muncul saat PR dibuka.

---

## 5. CI/CD Checks & Perintah Build/Test Lokal

### A. Pipeline CI (GitHub Actions & CircleCI)

1. **GitHub Actions** ([`.github/workflows/`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/workflows)):
   - [`pkgprnew.yml`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/workflows/pkgprnew.yml) — membuild rilis (`npm run build:release`) dan mempublikasikan preview packages ke `pkg.pr.new` untuk setiap PR.
   - [`trigger-circleci-pr-full.yml`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/workflows/trigger-circleci-pr-full.yml) — maintainer (`MEMBER`/`OWNER`/`COLLABORATOR`) dapat memicu suite `pr_full` lewat komentar `/ci full` atau label `ci:full`.
   - [`trigger-circleci-bench.yml`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/workflows/trigger-circleci-bench.yml) — memicu benchmark Tachometer melalui `/ci bench`.
   - [`release.yml`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.github/workflows/release.yml), `dev-prerelease.yml`, dan `add-latest-tags.yml` — otomasi rilis manual berbasis Changesets.

2. **CircleCI** ([`.circleci/config.yml`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/.circleci/config.yml#L802-L984)):
   - **`pr_lite`** (otomatis pada setiap branch PR):
     - `pr_lite_check_doc` (otomatis membatalkan workflow bila commit range hanya menyentuh path `^doc`)
     - `pr_lite_install`
     - `pr_lite_build` (`build_release` + `test_dev_runners`)
     - `pr_lite_test_esm` (`npm run test-chrome` di ChromeHeadlessOpt)
     - `pr_lite_test_node` (`npm run test-node` via Mocha)
     - `pr_lite_e2e_smoke_vite` (`packages/__e2e__/1-gh-issues`)
   - **`pr_full`** (on-demand via `/ci full`): menambah `pr_full_test_toolings` (CJS) dan Playwright E2E suites (`2-hmr-vite`, `14-vite8-decorators`, `17-vite-template-assets`, `6-router` webpack+prod, `15-ts6-webpack-smoke`, `16-ts7-webpack-smoke`, serta Verdaccio E2E `typescript-7-conventions`).
   - **Checks eksternal teramati pada PR** (dari `#2584`, `#2563`, `#2555`): `DeepScan`, `codecov/patch`, `codecov/project`, `GitBook - docs.aurelia.io/`, dan `Continuous Releases` (`pkg.pr.new`).

### B. Perintah Build, Lint, dan Test Lokal (Dokumentasi Saja — Jangan Dijalankan di Submodule)

Menurut [`package.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/package.json#L72-L112), [`AGENTS.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/AGENTS.md#L12-L21), [`building-and-testing-aurelia.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/user-docs/community-contribution/building-and-testing-aurelia.md), dan [`packages/__tests__/package.json`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/packages/__tests__/package.json):

- **Environment target** (`volta` & `engines`): Node `22.22.2` (`>=22.22.2 <23`), npm `10.9.0` (`>=10.0.0 <11`).
- **Instalasi & build awal**:
  - `npm ci`
  - `npm run build` (Turbo build untuk `@aurelia/*` dan `aurelia`) atau `npm run build:release` (Rollup release build)
  - Build parsial satu package: `cd packages/<package> && npm run build`
- **Linting**:
  - `npm run lint` (`turbo lint && npm run lint:other`)
- **Focused Dev & Test Loop**:
  - `npm run dev -- --test <pattern> [--node-tests] [--dev <pkg>] [--tooling <pkg>] [--e2e <fixture>]`
  - Tooling: `npm run dev:tooling -- --test <pattern>`
- **Unit & Integration Tests (`packages/__tests__`)**:
  - Browser (Karma + ChromeHeadlessOpt): `npm run test` (di root) atau `npm run test:watch` / `npm run test:debugger`
  - Node (Mocha): `cd packages/__tests__ && npm run test-node`
  - Per-package di Node: `npm run test-node:kernel`, `test-node:runtime`, `test-node:runtime-html`, `test-node:router`, `test-node:router-direct`, `test-node:state`, `test-node:validation`, `test-node:i18n`
- **E2E Playwright Fixtures (`packages/__e2e__/*`)**:
  - `cd packages/__e2e__/<fixture> && npm run test:e2e` (mis. `6-router`, `2-hmr-vite`, `17-vite-template-assets`)

---

## 6. Lanskap Aktivitas Upstream Terkini (Bukti GitHub `aurelia/aurelia`)

### A. 30 Merged PR Terbaru & Pola Kontributor

Dari `gh pr list -R aurelia/aurelia --state merged --limit 30`, aktivitas merge terakhir (September–November 2026) didominasi langsung oleh core maintainers dengan disiplin pesan Conventional Commits yang ketat:

- **Kontributor utama pada 30 PR terakhir**: Dwayne Charrington (`Vheissu`), Fred Kleuver (`fkleuver`), `bigopon`, dan Gavin Aiken (`gavinaiken`, PR [#2584](https://github.com/aurelia/aurelia/pull/2584)).
- **PR terbaru yang relevan langsung dengan SSR, Router, & AI/DX**:
  - [`#2585`](https://github.com/aurelia/aurelia/pull/2585) — `docs(all): rewrite developing with AI guide for current agents` (`Vheissu`, 2026-11-03)
  - [`#2584`](https://github.com/aurelia/aurelia/pull/2584) — `fix(runtime): resync collection length and size observers on resubscribe` (`gavinaiken`, 2026-11-06)
  - [`#2563`](https://github.com/aurelia/aurelia/pull/2563) — `fix(runtime-html): keep server-rendered text nodes intact across the HTML round trip` (`Vheissu`, 2026-11-05)
  - [`#2561`](https://github.com/aurelia/aurelia/pull/2561) — `fix(runtime-html): run hydrate through start so stop and au-started work` (`Vheissu`, 2026-11-04)
  - [`#2556`](https://github.com/aurelia/aurelia/pull/2556) — `feat(router): support lazy route factories` (`Vheissu`, 2026-11-15)
  - [`#2473`](https://github.com/aurelia/aurelia/pull/2473) & [`#2468`](https://github.com/aurelia/aurelia/pull/2468) — perbaikan dan fitur asset URL di `vite-plugin` (`fkleuver`, `bigopon`, Sept 2026)

### B. Open Issues & PR Aktif Seputar SSR, Hydration, dan Router

Pencarian `gh issue list -R aurelia/aurelia --state open --search "SSR OR hydration OR router"` dan `gh pr list -R aurelia/aurelia --state open` menunjukkan bahwa **tim inti (`Vheissu` dan `fkleuver`) sedang menjalankan gelombang inisiatif SSR & Router besar-besaran sejak akhir September 2026**:

1. **Bug & Optimasi SSR/Hydration di Core (Open Issues)**:
   - [`#2494`](https://github.com/aurelia/aurelia/issues/2494) — *Module-level template cache keeps documents alive and returns nodes from the wrong document* (berkaitan langsung dengan `AUR0757` / multi-document SSR).
   - [`#2527`](https://github.com/aurelia/aurelia/issues/2527) — *Hydration binds the wrong nodes when a template-controller view directly contains another template controller*.
   - [`#2528`](https://github.com/aurelia/aurelia/issues/2528) — *Hydration detaches and re-inserts every server-rendered node, dropping focus and reloading iframes*.
   - [`#2530`](https://github.com/aurelia/aurelia/issues/2530) — *Hydration treats every hyphenated tag as an Aurelia component boundary, breaking web components and un-hyphenated custom elements*.
   - [`#2531`](https://github.com/aurelia/aurelia/issues/2531) — *Containerless elements, au-compose, au-slot, promise and shadow DOM components cannot be hydrated*.
   - [`#2538`](https://github.com/aurelia/aurelia/issues/2538) — *SSR server cost: skip DOM teardown on discarded documents, record the manifest during render, compact the wire payload*.

2. **RFC & Feature Requests SSR/Router (serta PR Terbuka yang Sudah Ada)**:
   - [`#2537`](https://github.com/aurelia/aurelia/issues/2537) (**RFC**) — *Incremental hydration and pre-hydration event replay*.
   - [`#2536`](https://github.com/aurelia/aurelia/issues/2536) — *Router SSR/SSG support: redirect and status signalling, per-route render mode, route discovery for prerendering*.
   - [`#2535`](https://github.com/aurelia/aurelia/issues/2535) — *Transfer server state to the client* → sudah memiliki **PR terbuka [`#2574`](https://github.com/aurelia/aurelia/pull/2574)** (`feat(runtime-html): transfer server state to the client for hydration`).
   - [`#2534`](https://github.com/aurelia/aurelia/issues/2534) — *App stability API (`pending tasks / whenStable`) so servers know when a page is ready to serialize*.
   - [`#2533`](https://github.com/aurelia/aurelia/issues/2533) — *Hydration mismatch detection, clear errors and automatic client-render fallback*.
   - [`#2546`](https://github.com/aurelia/aurelia/issues/2546) — *Head management: meta, link and canonical tags* → sudah memiliki **PR terbuka [`#2559`](https://github.com/aurelia/aurelia/pull/2559)**.
   - [`#2542`](https://github.com/aurelia/aurelia/issues/2542) — *Error boundaries* → sudah memiliki **PR terbuka [`#2565`](https://github.com/aurelia/aurelia/pull/2565)**.
   - [`#2544`](https://github.com/aurelia/aurelia/issues/2544) — *Deferred rendering* → sudah memiliki **PR terbuka [`#2560`](https://github.com/aurelia/aurelia/pull/2560)**.
   - Router core issues/RFCs terbuka: [`#2256`](https://github.com/aurelia/aurelia/issues/2256) (RFC path interpretation), [`#2496`](https://github.com/aurelia/aurelia/issues/2496), [`#2497`](https://github.com/aurelia/aurelia/issues/2497) (RFC instruction syntax vs ordinary URLs), [`#2498`](https://github.com/aurelia/aurelia/issues/2498), [`#2499`](https://github.com/aurelia/aurelia/issues/2499), [`#2500`](https://github.com/aurelia/aurelia/issues/2500), [`#2520`](https://github.com/aurelia/aurelia/issues/2520), [`#2521`](https://github.com/aurelia/aurelia/issues/2521), serta PR terbuka [`#2479`](https://github.com/aurelia/aurelia/pull/2479) (`feat(router): add application URL navigation and fix contextual routing`).

### C. Label Kontributor Baru

- Pencarian label `"good first issue"` mengembalikan `[]` (label tersebut tidak dipakai di repositori ini).
- Label padanan yang terdaftar di repo adalah **`"help wanted"`** (*"Good first issue for new contributors"*) dan **`"PR welcome"`** (*"Contribution welcome!"*), namun per query terakhir keduanya memiliki `0` open issues. Artinya, celah kontribusi terbaik saat ini bukan dari tiket berlabel pemula, melainkan dari *targeted bug fixes* pada issue terbuka yang belum memiliki PR atau diskusi di RFC/issue SSR yang sudah dibuka oleh maintainer.

---

## 7. Ethical Contribution Playbook

Prinsip-prinsip ini wajib menjadi pedoman sebelum mengirim komentar, RFC, atau PR apa pun ke `aurelia/aurelia`:

1. **Diskusikan Sebelum PR Besar (No Surprise Mega-PRs)**:
   - Setiap perubahan API publik, mekanisme hydration baru, atau perubahan perilaku `router` dan `template-compiler` harus dimulai dari RFC atau komentar pada issue terkait (mis. `#2494`, `#2534`, `#2536`, `#2537`) sebelum mengimplementasikan PR.
   - Selalu cek apakah maintainer sudah membuka issue atau PR aktif (mis. `#2559`, `#2560`, `#2565`, `#2574`) agar tidak menduplikasi pekerjaan atau menabrak arsitektur yang sedang dikerjakan Dwayne (`Vheissu`) dan Fred (`fkleuver`).

2. **PR Kecil, Terfokus, dan Lengkap dengan Test**:
   - Pisahkan `fix(...)` dari `feat(...)` dan dari `refactor(...)` ([`docs/CONTRIBUTING.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/docs/CONTRIBUTING.md#L187)).
   - Setiap PR kode wajib menyertakan regression test di `packages/__tests__` (Node maupun browser bila menyangkut DOM), melewati `npm run lint` dan `npm run build`, serta menyertakan `.changeset/*.md` bila menyentuh package yang dipublish.

3. **Hormati Roadmap, Batasan Package, dan Gaya Maintainer**:
   - Patuhi [`AGENTS.md`](file:///home/dev/project/aureliajs/packages/upstream/aurelia/AGENTS.md#L23-L36): minimal *allocation footprint* di *hot paths*, pergunakan utilitas yang sudah ada di core (`@aurelia/kernel`, `@aurelia/runtime`, `@aurelia/runtime-html`), tandai helper internal dengan `/** @internal */`, dan lengkapi API publik dengan TSDoc.
   - Jangan memaksa konsep meta-framework spesifik (seperti adaptor Vercel/Node atau konvensi `.aux` / Hono) masuk ke `@aurelia/runtime-html` atau `@aurelia/router`; biarkan core Aurelia tetap *web-standards-first*, DI-native, dan *platform-agnostic*, sementara integrasi runtime/meta-framework tetap berada di ekosistem kita (`@aureliajs/*`, `@hono/aurelia`).

4. **Transparansi Atribusi & Penggunaan AI Assistance**:
   - Sebutkan secara jujur sumber inspirasi/kredit (issue terkait, diskusi komunitas, atau proyek referensi seperti `@aureliajs/ssr` jika relevan) tanpa klaim sepihak.
   - Bila menggunakan bantuan AI dalam menyusun patch atau test, ungkapkan secara transparan di bagian *Reviewer Notes* PR, dan **verifikasi setiap baris serta jalankan sendiri seluruh build & test suite** (sesuai kebijakan `AGENTS.md`: *"Skipping validation or hand-waving about 'should work' is not acceptable"*). Kontributor manusia bertanggung jawab penuh atas kebenaran kode yang dikirim.

5. **Tidak Ada *Unsolicited Rewrites***:
   - Jangan me-refactor kode atau dokumentasi di luar lingkup issue/PR yang disepakati, jangan mengubah style file yang tidak disentuh, dan jangan mengganti konvensi existing (mis. Karma/Mocha/Rollup/npm workspaces) dengan tooling luar (seperti Bun/oxlint).

6. **Urutan Tetap (Fixed Sequence) untuk Mengusulkan Pekerjaan SSR Kita ke Upstream**:
   1. **Audit & Pemetaan Issue Eksisting**: Cocokkan temuan kita (mis. root cause `AUR0757`, `AUR0016`, mutasi `element.attributes` di compiler, stability API, router SSR hooks) dengan open issues/PRs yang sudah ada (`#2494`, `#2527`–`#2538`, `#2546`, `#2559`, `#2574`) untuk memastikan belum ada solusi yang sedang berjalan.
   2. **Validasi Reproduksi Minimal di Fork Lokal**: Buat *minimal reproduction spec* di fork `sandikodev/aurelia` (mengikuti environment Node 22 + `packages/__tests__`) tanpa ketergantungan pada `@aureliajs/*` atau `linkedom`/`jsdom` eksternal di luar dependency repo upstream.
   3. **Konsultasi di Issue / RFC Terkait (atau Discord)**: Laporkan *root cause* dan usulan perbaikan ringkas di issue upstream yang relevan (atau buka RFC baru memakai `.github/ISSUE_TEMPLATE/rfc.md` jika memang belum ada issue untuk celah arsitektur tersebut), lalu tunggu sinyal persetujuan dari maintainer (`fkleuver` / `Vheissu` / `bigopon`).
   4. **Submit PR Bugfix Terkecil Lebih Dulu**: Mulai dari *small, high-signal bugfix PRs* (mis. perbaikan spesifik di `template-compiler` atau isolasi document di SSR/hydration bila belum terselesaikan oleh `#2494`), lengkap dengan test & changeset, mengikuti template `.github/PULL_REQUEST_TEMPLATE/bug_fix.md` dan format commitlint.
   5. **Iterasi Review & Rebase Bersih**: Tanggapi komentar reviewer, pastikan `pr_lite` (dan `pr_full` bila dipicu) hijau, tandatangani CLA jika diminta oleh check PR, dan *rebase* terhadap `upstream/master` hingga merge.
   6. **Ekspansi Bertahap ke API/RFC Baru**: Hanya setelah patch fondasional tervalidasi dan selaras dengan arah PR SSR yang ada (`#2534` `whenStable`, `#2536` router SSR/SSG), ajukan proposal atau PR lanjutan untuk ekstensi kontrak SSR/hydration di core, sementara lapisan opinionated (Hono, `.aux`, islands, edge adapters) tetap dikelola di repo kita.
