# Facebook drafts (Bahasa Indonesia)

Dua varian. Postingan pendek untuk feed, dan versi lebih panjang untuk grup komunitas. Sesuaikan dengan tone akun pribadi Anda.

---

## Varian pendek

Selesai juga satu babak panjang di repo Aurelia 2 saya minggu ini.

Bukan cuma soal nambah fitur. Yang saya kerjakan justru merapikan batasnya.

Reponya dibagi dua bagian tegas. `apps/` untuk produk SaaS: Aurelia 2 di depan, Hono + Postgres + Stripe di belakang. `packages/` untuk infrastruktur framework: SSR, islands, compiler `.aux`, dan adapter Hono. Package tidak pernah mengimpor dari apps.

Beberapa hal yang akhirnya beres:

- Autentikasi telemetry tidak lagi pakai `demo-token`. Sekarang fail closed kalau token tidak dikonfigurasi.
- Angka di dokumentasi sudah diselaraskan dengan hasil verifikasi: 275 test, 1.651 assertion, 49 test browser.
- Web Analytics aktif, dan error aneh di console browser sudah hilang.
- Landing page statis tetap 100/100/100/100 di Lighthouse, LCP 1,2 detik di mobile.

Yang paling saya pegang: produksi mulai dari kosong. Tidak ada akun demo, tidak ada seed data, tidak ada mock backend. Kalau API mati, tampilannya bilang kosong, bukan pura-pura ada isi.

Tulisan panjangnya ada di [personal website URL]. Repo di [GitHub repository URL].

Kalau Anda bangun pakai Aurelia 2 atau lagi bandingkan stack buat aplikasi enterprise, saya senang diskusi di kolom komentar.

---

## Varian grup komunitas

Halo teman-teman,

Saya mau share catatan dari pekerjaan terakhir saya di ekosistem Aurelia 2. Mungkin berguna buat yang sedang pakai Aurelia untuk proyek nyata, bukan sekadar playground.

**Kesimpulan paling penting:** keputusan arsitektur yang paling berdampak ternyata ada di build script, bukan di binding engine.

Landing page-nya saya render statis di build time. CSS critical di-inline, font di-preload, script SPA-nya saya buang. Hasilnya file `landing.html` terpisah dari `app.html` yang dipakai SPA. Pengunjung yang cuma baca halaman depan tidak pernah mengunduh runtime aplikasi.

Hasil Lighthouse: 100/100/100/100 di mobile dan desktop. LCP 1,2 detik di mobile, 0,3 detik di desktop.

**Soal data, saya sengaja keras.** Produksi mulai kosong. Seed script menolak host Neon. Tidak ada akun demo. Satu-satunya jalan masuk adalah signup publik yang membuat user, workspace, membership owner, audit log, dan session dalam satu transaksi. Saat API mati, halaman menampilkan state kosong atau error, bukan data palsu.

Saya juga jalankan smoke test langsung ke produksi. Script daftar akun buangan, cek bahwa daftar project kosong, lalu hapus semua lewat koneksi SQL langsung. Hasil terakhir: 36 lolos, 0 gagal, 6 dilewati.

**Di sisi framework,** saya merawat adapter Hono yang memakai Web Standards murni. State per request disimpan di `WeakMap<Request, ...>`, SSR pakai Web Streams sungguhan, tidak ada `node:fs` di runtime, dan hidrasi client dijadwalkan dengan `requestIdleCallback`.

Baru saja saya hapus juga `demo-token` dari contoh. Sekarang endpoint telemetry mengembalikan 401 kalau token tidak dikonfigurasi. Di dokumentasi publik juga sudah tidak ada entri dashboardnya.

Tulisan lengkapnya: [personal website URL]
Kode sumber: [GitHub repository URL]

Silakan kritik atau tanya apa saja, terutama soal pemisahan antara kode aplikasi dan kode framework. Saya memang ingin perdebatan itu terjadi dengan kode di meja.
