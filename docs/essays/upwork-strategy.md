# Strategi Upwork: dari "pencari kerja" ke "partner teknis"

Dokumen ini bukan motivasi. Ini daftar keputusan: apa yang **layak** kamu pertaruhkan waktunya,
apa yang **tidak**, dan bagaimana caranya supaya klien melihatmu sebagai orang yang mereka ajak
bekerja sama — bukan orang yang mereka rekrut paling murah.

Konteks: repo ini (`aureliajs`) adalah bukti kerja, bukan sekadar contoh kode. Setiap kali
dokumen ini bilang "tunjukkan X", X harus bisa diklik dalam < 60 detik oleh klien.

---

## 0. Satu kalimat posisi

> "Saya frontend/TypeScript engineer yang masuk ke codebase yang sudah berjalan — termasuk
> Aurelia 1/2 yang tidak ada orangnya — lalu mengubahnya jadi sesuatu yang bisa di-deploy,
> di-test, dan diserahkan ke tim."

Kenapa bukan "Aurelia 2 Developer":

| Posisi                                             | Yang terjadi                                                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Aurelia Developer"                                | Kamu bersaing di kolam kecil, tapi klien harus **sudah** punya Aurelia dan **sudah** tahu mereka butuh Aurelia. Permintaan sedikit, dan yang ada biasanya panic-migration. |
| "TypeScript SaaS engineer (bisa masuk ke Aurelia)" | Kolam besar, dan kamu punya alasan kredibel untuk menang: hampir tidak ada yang mau menyentuh Aurelia, jadi kamu tidak punya 50 pesaing.                                   |
| "Migration & rescue"                               | Ini posisi paling menguntungkan. Klien dengan app rusak tidak menawar per jam — mereka menawar "bisa selesai atau tidak".                                                  |

Kalimat pembuka profil dan baris pertama proposal **wajib** menyebut outcome, bukan framework.
Framework muncul di kalimat kedua sebagai _alat_, bukan sebagai identitas.

---

## 1. Apa yang PENTING (taruh 80% energimu di sini)

Urutan ini sengaja: dari yang paling menentukan menang/kalah, ke yang cuma mempercantik.

### 1.1 Bukti yang bisa diklik (paling penting)

Klien tidak membaca kode. Mereka membuka link. Tiga artefak ini cukup:

1. **Demo hidup** — dashboard SaaS ini, jalan, bisa login, bisa bikin project, bisa ganti tema.
   Idealnya juga ada akun demo read-only supaya mereka tidak menghapus data.
2. **Repo publik yang rapi** — README 1 layar, jalan dengan 3 perintah, ada test, ada CI badge.
3. **Satu studi kasus 1 halaman** — masalah → keputusan → trade-off → apa yang **sengaja**
   belum dikerjakan (`docs/case-study.md`).

Tanpa ini, semua usaha lain (proposal, koneksi, harga) bekerja dua kali lebih keras untuk hasil
setengah.

### 1.2 Proposal yang mendiagnosis, bukan yang menjual

Struktur yang menang (≤ 180 kata, dibaca di ponsel):

1. **Ulangi masalahnya dengan bahasa mereka** — buktikan kamu membaca. Kalau job post-nya
   berantakan, sebutkan bagian mana yang ambigu dan tebak kenapa.
2. **Satu rencana konkret 1–2 kalimat** — apa yang kamu lakukan di minggu pertama, apa yang bisa
   diverifikasi di akhir minggu pertama.
3. **Satu risiko/pertanyaan** — "Kalau state management-nya masih `@aurelia/store` alpha, kita
   perlu putuskan: pin versi atau migrasi ke `@aurelia/state`. Saya sarankan pin dulu."
   Ini yang membedakan engineer dari orang yang menyalin template proposal.
4. **Langkah berikutnya yang kecil** — "Saya bisa kirim 1 halaman rencana + estimasi dalam 24 jam
   setelah saya lihat repo-nya (atau 20 menit call)."

Yang **tidak** perlu: paragraf "I am a passionate developer with 8 years experience", daftar 20
teknologi, jaminan "100% satisfaction", atau menempel semua link portfolio tanpa konteks.

### 1.3 Kecepatan respons pertama (jam, bukan hari)

Di Upwork, responden pertama yang **kredibel** menang jauh lebih sering daripada yang terbaik
tapi datang 20 jam kemudian. Aturan praktis:

- Slot 15 menit, 2× sehari, khusus membalas invite + job yang benar-benar cocok.
- Kualitas tetap: kalau tidak sempat mendiagnosis, kirim 3 pertanyaan tajam + bilang kapan kamu
  akan kirim rencana. Itu masih terlihat jauh lebih profesional daripada balasan template.

### 1.4 Ritme kerja yang membuatmu terlihat seperti anggota tim

Ini bagian yang paling diabaikan dan paling besar efeknya untuk berubah dari vendor → partner:

| Ritme                        | Isi                                                          | Efek                                    |
| ---------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Setiap Senin                 | 5 baris: minggu lalu, minggu ini, risiko, yang kamu butuhkan | Klien tidak perlu bertanya "progress?"  |
| Setiap PR                    | Deskripsi: apa, kenapa, cara test, screenshot kalau UI       | Review jadi 5 menit, bukan 50           |
| Setiap Jumat (atau 2 minggu) | Demo 10 menit + changelog                                    | Klien melihat nilai, bukan jam          |
| Setiap keputusan besar       | 1 paragraf trade-off ditulis di issue, bukan di call         | Keputusan bisa diwariskan ke tim mereka |

Kalau kamu melakukan 4 hal ini, kamu berhenti jadi "freelancer" dalam 2–3 minggu. Klien akan
mulai bertanya "menurut kamu sebaiknya bagaimana?" — itu tanda kamu sudah di dalam, bukan di luar.

### 1.5 Dokumentasi yang menjawab "bisa dipakai atau tidak"

README yang berguna berisi: cara jalan (3 perintah), env yang dibutuhkan, akun demo, apa yang
belum jadi, dan di mana harus melihat kalau mau menilai kualitas. Klien teknis akan
men-skim ini **sebelum** membuka call. Satu README bagus menghemat 30 menit call.

### 1.6 Bukti bahwa kamu bisa bekerja dengan kode orang lain

Ini inti dari "partner". Tunjukkan satu contoh di mana kamu:

- menemukan bug di kode yang bukan milikmu,
- menulis test yang menangkapnya,
- memperbaiki tanpa mengubah arsitektur orang lain.

Kalau belum punya, buat sekarang: ambil satu library open-source kecil, kirim PR perbaikan nyata
(dokumentasi/typo tidak dihitung). Itu bukti paling murah dan paling sulit dibantah.

---

## 2. Apa yang TIDAK penting (hentikan)

Daftar ini dibuat supaya kamu berhenti mengerjakannya. Bukan karena buruk, tapi karena
**return-nya mendekati nol** dibanding 5 hal di atas.

| Tidak penting                                               | Kenapa                                      | Lakukan ini instead                                         |
| ----------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Sertifikat kursus                                           | Klien tidak pernah memintanya di 1:1 teknis | Satu demo + satu studi kasus                                |
| Menulis "expert" di 12 framework                            | Membuatmu terlihat generalis murah          | 2 keahlian + 1 cerita spesifik                              |
| "Available 40 hours/week" di profil                         | Kolom jam, bukan pembeda                    | "Bisa mulai Senin, 20 jam/minggu, overlap 4 jam dengan EST" |
| Menawar paling murah                                        | Menang lelang termurah = klien terburuk     | Naikkan harga, persempit scope                              |
| Rewrite total karena "kode lama jelek"                      | Klien takut kehilangan investasi            | Tunjukkan jalur bertahap + biaya tiap langkah               |
| Portfolio 15 item tanpa konteks                             | Semua terlihat sama                         | 2–3 item dengan masalah & hasil                             |
| Desain ulang profil tiap minggu                             | Optimasi lokal, bukan hasil                 | 30 menit/minggu untuk proposal + follow-up                  |
| Menambah fitur ke demo yang tidak dipakai klien             | Sunk cost                                   | Fitur yang membuktikan _satu_ klaim di proposal             |
| Menghindari call karena "tidak percaya diri bahasa Inggris" | Call = filter utama klien serius            | 20 menit, kamera nyala, 3 pertanyaan siap                   |
| Mengklaim jam kerja 60/minggu                               | Terdengar desperat, bukan kompeten          | Estimasi realistis + buffer                                 |

Aturan praktis: **kalau sebuah kegiatan tidak menghasilkan bukti, diagnosis, atau hubungan,
jangan dikerjakan minggu ini.**

---

## 3. Tangga penawaran (offer ladder)

Jangan tawarkan satu hal. Tawarkan tiga ukuran, supaya klien bisa memilih "seberapa yakin" mereka.

### Tingkat 1 — Rescue Audit (pintu masuk, fixed price)

- **Durasi:** 3–5 hari kerja.
- **Harga:** $600–$1.200 (naikkan setelah 3 klien pertama).
- **Isi:** baca repo, jalankan app, temukan 5–10 risiko nyata (security, state, build, test,
  dependency), tulis 1 halaman prioritas + estimasi.
- **Deliverable:** dokumen 3–5 halaman + 30 menit walkthrough.
- **Kenapa ini menang:** kecil, tanpa risiko bagi klien, dan **selalu** berujung ke pekerjaan
  lanjutan kalau temuannya benar. Ini juga cara tercepat mengubah "siapa kamu?" jadi
  "kapan bisa mulai?".

### Tingkat 2 — Feature Sprint (inti penghasilan)

- **Durasi:** 1–3 minggu.
- **Harga:** $1.500–$6.000 per sprint (atau $45–$75/jam untuk klien pertama).
- **Isi:** satu potongan vertikal yang bisa dipakai — auth + RBAC, billing, dashboard, migrasi
  satu halaman, test suite.
- **Definisi selesai ditulis di depan:** demo bisa diklik, test hijau, PR merge, dokumentasi 1
  paragraf.
- **Kenapa ini menang:** hasil terlihat tiap minggu, sehingga retainer jadi keputusan mudah.

### Tingkat 3 — Embedded Partner (retainer)

- **Durasi:** 3–6 bulan, 10–20 jam/minggu.
- **Harga:** $2.000–$5.000/bulan (atau harian).
- **Isi:** kamu jadi bagian tim: review PR, jaga build, ambil 1–2 fitur, hadir di standup mingguan.
- **Kenapa ini menang:** ini posisi "team mate" yang kamu incar. Klien tidak membeli jam, mereka
  membeli "ada orang yang menjawab".

**Aturan transisi:** setiap Audit harus diakhiri dengan satu dari dua kalimat — "ini rencana
sprint berikutnya, mau saya mulai?" atau "ini yang bisa dikerjakan tim internal, saya tidak
perlu di sini". Kejujuran kedua justru menghasilkan referral.

---

## 4. Siapa klien yang tepat (dan siapa yang harus kamu tolak)

### Cari yang seperti ini

- Agency / software house dengan **satu** app Aurelia 1 atau 2 yang butuh bantuan orang yang
  paham framework-nya (langka → kamu hampir tanpa pesaing).
- Tim produk dengan app legacy yang mau migrasi bertahap (Angular/Vue/Aurelia 1 → Aurelia 2 /
  framework lain).
- Founder non-teknis yang punya app jalan tapi takut menyentuhnya (butuh "penjaga", bukan
  pembangun).
- Tim yang sudah punya developer tunggal dan butuh orang kedua untuk review + mempercepat.

### Tolak (atau harga 3×) yang seperti ini

- "Buatkan aplikasi seperti X, budget $200, deadline 3 hari."
- Tidak mau memberi akses repo sebelum kontrak; minta kamu "menebak" arsitektur.
- Sudah punya 3 developer yang gagal dan menyalahkan semuanya tanpa memberi konteks.
- Scope berubah tiap pesan dan tidak mau menulis apa pun.
- Menawar harga sebelum menjelaskan masalah.

Red flags ini bukan soal ego — ini prediktor **sunk cost**. Satu klien buruk menghabiskan energi
3 klien baik.

---

## 5. Template yang bisa langsung dipakai

### 5.1 Baris pertama profil (≤ 2 baris)

> "I fix and ship TypeScript SaaS front-ends — including Aurelia apps most freelancers skip.
> Latest: a multi-tenant admin dashboard with auth seams, RBAC-ready UI, and a 1 000-row data
> path that stays under 200 kB gzipped."

### 5.2 Proposal (≤ 180 kata)

```
Hi {name},

You said {restate problem in their words}. The part that worries me is {specific risk} —
{satu kalimat kenapa itu mahal kalau dibiarkan}.

My plan for week one:
1) {langkah teknis konkret, bisa diverifikasi}
2) {langkah kedua}
3) {test/CI supaya tidak regresi}

I'd keep the first step small on purpose: {alasan singkat, mis. "supaya kamu bisa berhenti
kalau arahnya salah"}.

Two questions before I estimate properly:
- {pertanyaan teknis tajam}
- {pertanyaan scope/akses}

If useful, I can send a 1-page plan + estimate within 24h — or we can do 20 minutes and I'll
tell you honestly whether you need me at all.

Sincerely,
{name}
{link demo} · {link case study}
```

Kenapa struktur ini bekerja: klien membaca baris 1 dan melihat masalahnya sendiri, bukan
template. Baris terakhir menurunkan risiko mereka.

### 5.3 Pertanyaan screening (dipakai saat call pertama, 20 menit)

1. "Apa yang membuat kamu mencari orang **sekarang**, bukan 3 bulan lalu?" → urgensi nyata.
2. "Siapa yang akan men-review PR saya?" → apakah ada tim teknis (partner) atau kamu sendirian
   (vendor).
3. "Kalau pekerjaan ini selesai bagus, apa yang terjadi setelahnya?" → apakah ada retainer.
4. "Versi framework/dependency yang di-pin di production apa?" → kompetensi instan.
5. "Apa yang sudah dicoba dan gagal?" → menghindari mengulang kesalahan yang sama.

### 5.4 Pesan follow-up (hari ke-4, sekali saja)

```
Hi {name} — quick follow-up on {problem}. I looked at {public info / repo} and noticed
{observasi spesifik 1 kalimat}. If you're still deciding, here's the smallest useful next
step: {1 kalimat}. If timing changed, no problem — happy to be a resource later.
```

Satu follow-up. Tidak lebih. Dua follow-up terlihat seperti desakan, bukan profesionalisme.

---

## 6. Bagaimana tampil sebagai team mate (bukan vendor)

Perbedaan praktisnya bisa diukur:

| Vendor                          | Team mate                                                              |
| ------------------------------- | ---------------------------------------------------------------------- |
| Menunggu instruksi              | Mengusulkan urutan kerja + alasan                                      |
| Melaporkan "sudah selesai"      | Melaporkan "selesai, ini cara verifikasinya, ini yang saya tinggalkan" |
| Menyembunyikan yang belum jalan | Menulis "belum jalan, ini rencananya, ini blocker-nya"                 |
| Menulis kode saja               | Menulis kode + catatan singkat supaya orang lain bisa melanjutkan      |
| Menghindari keputusan           | Mengambil keputusan kecil, menaikkan yang besar dengan rekomendasi     |
| Menjual jam                     | Menjual hasil + kepercayaan                                            |

Tiga kebiasaan yang paling cepat mengubah persepsi:

1. **Selalu bawa rekomendasi, bukan hanya pilihan.** "Ada dua cara; saya sarankan A karena B."
   Klien tidak ingin menjadi arsitek; mereka ingin keputusan yang bisa dipertanggungjawabkan.
2. **Tulis di tempat yang sama dengan tim.** Kalau mereka pakai GitHub Issues, tulis di sana.
   Jangan buat dokumen terpisah yang tidak akan dibuka.
3. **Tinggalkan jejak.** Setiap PR punya "cara test". Setiap keputusan punya 3 baris alasan.
   Ini yang membuat klien merasa aman menyerahkan hal lain kepadamu.

---

## 7. Rencana 30 / 60 / 90 hari (operasional, bukan slogan)

### Hari 1–30 — bukti

- [ ] Demo publik live (Vercel/Cloudflare) + akun demo read-only.
- [ ] README 1 layar + `docs/case-study.md` selesai.
- [ ] CI hijau (typecheck, lint, build, test, e2e).
- [ ] 1 PR nyata ke proyek open-source lain (bukti bisa masuk kode orang).
- [ ] Profil: 2 baris posisi, 1 demo, 1 studi kasus. Hapus daftar teknologi panjang.
- [ ] Kirim 10 proposal **yang didiagnosis**. Target: ≥ 3 balasan.

### Hari 31–60 — kualitas percakapan

- [ ] 3 call. Setiap call: 5 pertanyaan screening, akhiri dengan next step kecil.
- [ ] 1 Audit terjual (harga pintu masuk, jangan gratis).
- [ ] Mulai kebiasaan Senin (laporan 5 baris) dan Jumat (changelog) untuk klien pertama.
- [ ] Ukur: balasan → call → kontrak. Perbaiki bagian dengan konversi terendah.

### Hari 61–90 — naik kelas

- [ ] 1 klien retainer atau 2 sprint berurutan.
- [ ] Naikkan harga 20–30% untuk klien baru.
- [ ] Tulis 1 artikel teknis pendek ("Aurelia 2 di production: yang tidak ada di dokumentasi")
      dan tautkan dari profil — ini magnet untuk klien Aurelia/legacy.
- [ ] Minta 1 testimoni yang menyebut **hasil**, bukan "orangnya ramah".

---

## 8. Metrik yang layak dipantau (dan yang tidak)

Pantau mingguan, 5 angka saja:

| Metrik                               | Target awal     | Kalau rendah, perbaiki                    |
| ------------------------------------ | --------------- | ----------------------------------------- |
| Proposal terkirim (yang didiagnosis) | 10/minggu       | Konsistensi, bukan kualitas               |
| Balasan / proposal                   | ≥ 30%           | Baris pertama + relevansi job             |
| Call / balasan                       | ≥ 50%           | Screening questions + kejelasan next step |
| Kontrak / call                       | ≥ 25%           | Offer ladder + harga                      |
| Rata-rata nilai kontrak              | naik tiap bulan | Scope, bukan jam                          |

**Jangan** pantau: jumlah koneksi, jumlah view profil, jam online, jumlah proposal total,
"Upwork score" sebagai tujuan. Itu input yang tidak berkorelasi langsung dengan penghasilan.

---

## 9. Bukti di repo ini yang bisa langsung dipakai

| Klaim di profil                          | Bukti di repo                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "Multi-tenant admin dashboard"           | `apps/api/src/middleware/tenant.ts` — seam tenancy yang jelas, siap ditukar ke session auth               |
| "Type-safe end-to-end"                   | `apps/shared/src/index.ts` — satu skema Zod dipakai web + API                                             |
| "Data path yang tidak takut 1 000 baris" | `apps/api/src/routes/projects.ts` — filter, sort, pagination di SQL; `apps/web/src/pages/projects-page.*` |
| "UI system, bukan CSS acak"              | `apps/web/src/ui/*` + token shadcn di `apps/web/src/styles/main.css`                                      |
| "Jujur soal batasan"                     | banner "Demo data", `docs/case-study.md` bagian _Deliberately deferred_                                   |
| "Bisa diuji"                             | `e2e/smoke.spec.ts` + CI                                                                                  |

Kalau kamu mengirim proposal untuk pekerjaan Aurelia/legacy, lampirkan **satu** link demo dan
**satu** paragraf tentang seam tenancy. Itu sinyal paling kuat bahwa kamu bisa masuk ke kode
orang lain tanpa merusaknya.

---

## 10. Ringkasan satu halaman

**Lakukan:** bukti yang bisa diklik, proposal yang mendiagnosis, respons cepat, ritme kerja
mingguan, dokumentasi jujur, satu PR ke kode orang lain.

**Hentikan:** sertifikat, daftar teknologi, perang harga, rewrite total, portfolio tanpa cerita,
follow-up berulang.

**Tujuan akhir:** klien tidak berkata "dia cepat". Klien berkata **"dia yang mengerti sistem
kita"** — karena itu yang membuat mereka memperpanjang kontrak tanpa kamu harus melamar lagi.
