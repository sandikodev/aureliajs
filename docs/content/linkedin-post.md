# LinkedIn — Sandikodev

Urutan ini sengaja dua fase. Tiga posting pertama bicara Aurelia 2 saja. Tidak ada Hono, tidak ada Vercel, tidak ada link repo. Tujuannya supaya timeline LinkedIn terbiasa melihat nama Aurelia 2 dari saya sebelum saya memperkenalkan kerjaan saya sendiri.

Baru di posting 4 dan 5 saya masukkan scaffold fullstack Aurelia 2 + Hono dan fakta bahwa sudah terdeploy di Vercel.

Aturan untuk seri ini:

- Satu posting, satu ide. Jangan gabungkan semua proof point di satu status.
- Pakai Bahasa Indonesia. Istilah teknis dibiarkan bahasa Inggris.
- Tidak ada "saya senang mengumumkan", "game changer", atau "perjalanan saya".
- Tidak ada em dash.
- Kalimat pendek. Kalau satu paragraf lebih dari tiga kalimat, dipotong.
- Link repo baru muncul di posting 5, dan ditaruh di komentar pertama.

---

## Fase 1 — Aurelia 2 dulu

### Posting 1

**Tujuan:** jawab langsung isu "Aurelia 2 sudah mati" tanpa terdengar defensif.

Aurelia 2 masih saya pakai.

Kabar di timeline bilang Aurelia sudah mati. Saya paham kenapa orang berpikir begitu. Komunitasnya kecil. Aktivitasnya tidak sebering ekosistem lain. Tutorial yang kebanyakan ada sudah usang.

Saya pakai Aurelia sejak 2017, waktu versi 1 masih baru. Yang bikin saya tetap di sini bukan harapan bahwa Aurelia akan sepopuler React. Itu tidak akan terjadi, dan saya tidak butuh itu.

Yang saya butuhkan sederhana. Template HTML tetap HTML. Logikanya class TypeScript biasa. Binding-nya langsung menyentuh DOM, bukan lewat Virtual DOM yang di-diff setiap perubahan.

Saat saya menulis form dengan dua puluh field dan aturan validasi, saya tidak perlu memikirkan store, memo, atau dependency array.

Aurelia 2 menyimpan semua itu. Beberapa bagian malah lebih rapi dari versi 1.

Saya tidak akan menyuruh siapa pun pindah. Saya cuma mau bilang, "Aurelia mati" bukan alasan untuk tidak pernah mencoba versi 2.

Kalau Anda pernah dengar isu itu tapi belum pernah buka dokumentasinya, coba sekarang.

---

### Posting 2

**Tujuan:** kasih satu hal konkret yang berubah dari Aurelia 1 ke 2. Masih tidak sebut repo.

Dulu saya kira Aurelia 2 cuma Aurelia 1 yang lebih cepat.

Ternyata yang berubah justru cara saya menulis komponen.

Di Aurelia 1 saya menulis ViewModel, template, lalu memastikan keduanya ketemu lewat konvensi nama. Di Aurelia 2 alurnya mirip, tapi dependency injection dan binding-nya lebih konsisten. Saya lebih jarang menulis kode hanya untuk menyambung dua bagian.

Bagian yang tetap saya suka: `if.bind`, `repeat.for`, dan `class.bind` terbaca seperti HTML. Bukan seperti ekspresi di dalam string.

Aurelia juga tetap langsung menyentuh DOM. Untuk aplikasi dengan tabel dan form yang banyak, ini terasa.

Yang bikin orang kecewa biasanya ekspektasi. Aurelia 2 bukan React dengan sintaks lain. Kalau yang Anda cari adalah ekosistem besar dan library untuk semua kebutuhan, Anda akan kecewa.

Kalau yang Anda cari adalah cara menulis aplikasi yang rapi tanpa banyak glue code, coba lagi.

---

### Posting 3

**Tujuan:** tunjukkan alasan pakai Aurelia 2 berdasarkan kerjaan nyata, bukan nostalgia. Tutup dengan undangan diskusi.

Alasan saya tetap pakai Aurelia 2 tahun ini sederhana. Saya bisa menyelesaikan kerjaan tanpa menambah library.

Contoh kecil. Saya perlu aturan validasi yang sama persis antara browser dan server. Saya tulis satu schema Zod, lalu dipakai di dua tempat. Pesan errornya pun sama. Di frontend saya tinggal petakan `issues[].path` ke field yang bersangkutan.

Contoh lain. State dan warna tombol saya tulis langsung di class binding. Tidak ada `clsx`. Tidak ada `class-variance-authority`. Itu bukan penemuan baru. Itu memang sudah ada di Aurelia dari awal.

Orang sering bertanya soal komunitas dan lowongan kerja. Itu pertanyaan jujur. Ekosistem Aurelia kecil. Saya tidak menyarankan siapa pun memilih framework hanya karena saya menggunakannya.

Saya pakai karena kerjaan saya selesai. Itu saja.

Kalau Anda punya pengalaman sebaliknya, saya mau dengar. Komentar yang tidak setuju biasanya lebih berguna daripada yang setuju.

---

## Fase 2 — baru sekarang perkenalkan scaffold

### Posting 4

**Tujuan:** mulai shows work, tapi masih simpan link dan detail deployment.

Tiga posting terakhir saya bicara Aurelia 2 tanpa pernah menunjukkan apa yang saya bangun. Sekarang saya cerita.

Saya bikin satu repo untuk menjawab pertanyaan saya sendiri: apakah Aurelia 2 bisa dipakai untuk aplikasi penuh, bukan cuma tampilan depan.

Isinya tiga bagian. `apps/web` untuk antarmuka Aurelia 2. `apps/api` untuk backend Hono, Postgres, dan Stripe. `apps/shared` untuk satu set schema yang dipakai dua-duanya.

Saya sengaja tidak menyatukan semuanya jadi satu framework besar. Aurelia mengurus tampilan. Hono mengurus HTTP. Keduanya dipisah, lalu disambung lewat kontrak yang sama.

Satu hal yang saya jaga sejak awal: package di folder `packages/` tidak pernah mengimpor apa pun dari `apps/`. Kalau aturan itu dilanggar, dua bagian tadi akan melekat lagi.

Repo ini sudah jalan di Vercel. Bukan proyek yang cuma bisa dijalankan di localhost.

Saya belum mau menjelaskan detail arsitekturnya sekarang. Satu posting cukup untuk satu ide.

Nanti saya cerita bagian yang paling sering bikin orang salah paham.

---

### Posting 5

**Tujuan:** baru sekarang sebut Vercel secara konkret dan taruh link di komentar pertama.

Scaffold Aurelia 2 + Hono yang saya sebut kemarin sudah terdeploy di Vercel.

Yang jalan bukan cuma halaman statis. Ada landing page yang di-build dari Aurelia SSR lalu dikirim sebagai HTML biasa. Ada SPA untuk bagian yang benar-benar butuh interaksi. Ada API Hono di belakangnya.

Satu hal yang saya perbaiki kemarin: landing page tidak mengunduh runtime SPA. File-nya terpisah dari app shell. Lighthouse di mobile 100/100/100/100. LCP 1,2 detik.

Saya juga membuang semua data demo dari database produksi. Sekarang kalau ada yang kosong, itu memang kosong. Pendaftaran adalah satu-satunya jalan masuk.

Ini bukan pengumuman produk. Ini catatan bahwa stack ini bisa dipakai untuk kerjaan nyata.

Link repo ada di komentar pertama.

---

## Setelah seri ini

Kalau kelima posting di atas sudah berjalan dan ada yang nanya soal detail teknis, baru masuk ke topik yang lebih dalam: tenancy di satu middleware file, 401 versus 403, ledger idempotency Stripe, dan adapter SSR berbasis Web Standards. Jangan mulai dari situ. Orang belum akan peduli.
