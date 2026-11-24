# LinkedIn — Sandikodev

Lima posting yang disusun dari pengalaman nyata: keliling ke banyak frontend, teringat lagi ke Aurelia, melihat ulang hubungan Aurelia dan Angular, baru setelah itu memperkenalkan eksperimen fullstack yang sudah terpasang di Vercel.

Aurelia bukan topik yang dipaksakan di setiap posting. Di tiga posting pertama ia muncul sebagai bagian dari perjalanan, bukan sebagai barang yang dijual.

## Prinsip yang dipakai

- Tulis sebagai orang yang sedang bercerita, bukan sedang menjalankan campaign.
- Tidak menjelaskan strategi konten kepada pembaca. Mereka tidak sedang mengikuti rangkaian kita.
- Tidak menaruh disclaimer sebelum orang bertanya.
- Istilah teknis boleh ada, tapi pembaca awam tetap harus menangkap maksudnya.
- Tiap posting punya bentuk berbeda. Jangan lima kali memakai pola pembuka, masalah, argumen, kesimpulan, pertanyaan.
- Tidak memaksakan pertanyaan engagement di akhir.
- Tidak ada buzzword, tidak ada klaim bombastis.
- Orang yang tidak pernah pakai Aurelia, tidak tahu Hono, dan tidak berniat jadi programmer tetap harus bisa menikmatinya.

---

## Posting 1

Beberapa bulan terakhir saya banyak berpindah tempat.

React, Vue, Svelte, Astro, Qwik, Preact, Solid, Lit. Saya baca, saya coba, saya bandingkan. Ada yang bikin saya cepat paham. Ada yang bikin saya berhenti di tengah karena cara berpikirnya tidak cocok dengan kepala saya.

Suatu hari saya sadar saya terlalu sibuk melihat ke kanan dan kiri. Saya jadi lupa bahwa dulu saya pernah kenal satu framework yang cara kerjanya masih saya ingat sampai sekarang.

Aurelia.

Saya tidak langsung menulis tentangnya waktu itu. Saya baca ulang dulu. Saya bandingkan dengan catatan lama saya. Kesannya tidak berubah, tapi alasan saya tertarik jadi berbeda.

Dulu saya tertarik karena cara menulis kodenya rapi. Sekarang saya tertarik karena setelah keliling tadi saya jadi bisa melihat pola yang sama di tempat lain.

Kadang yang kita cari bukan yang paling baru. Kadang yang kita butuhkan adalah melihat lagi sesuatu yang sudah kita kenal, dengan mata yang sudah berubah.

---

## Posting 2

Saya dulu agak alergi sama Angular.

Bukan karena Angular buruk. Waktu itu saya lihat banyak aturan, banyak struktur, dan banyak hal yang harus dipahami sebelum bisa menulis baris pertama. Saya merasa rumit.

Belakangan saya baca ulang sejarahnya. Aurelia lahir dari orang-orang yang terlibat dalam revolusi Angular 2 jamannya. Rob Eisenberg keluar dari tim inti Angular, lalu membangun Aurelia dengan ide yang sedikit beda. Tampilannya HTML biasa. Logikanya class biasa. Tidak perlu banyak upacara untuk memulai.

Saya menemukan ini bukan dari tulisan yang mengatakan Aurelia hebat. Saya menemukannya setelah keliling ke banyak framework dan akhirnya punya dasar untuk membandingkan.

Yang bikin saya berhenti sejenak: dua framework yang berasal dari masa yang sama bisa berakhir di tempat yang berbeda. Satu jadi pilihan besar di banyak perusahaan. Satu tetap kecil, tapi tetap dipakai orang.

Mana yang lebih besar tidak terlalu penting bagi saya. Yang lebih menarik adalah kebutuhan apa yang dijawab masing-masing.

Sejak itu saya jadi lebih suka membaca sejarah teknologi. Alasan kenapa kita memakai sesuatu sering tersimpan di sana.

---

## Posting 3

Setelah keliling tadi, saya mulai melihat tiap frontend punya kebiasaan sendiri.

React mengajarkan orang membangun dari fungsi dan state. Vue menawarkan jalan masuk yang lebih ringan. Svelte menggeser sebagian kerja ke compiler. Astro mengubah kebiasaan soal apa yang dikirim ke browser. Qwik, Preact, Solid, Lit, masing-masing punya penekanan sendiri.

Angular punya penawaran khusus. Ia mengatur banyak hal sejak awal, dan itu masuk akal untuk tim besar yang butuh keseragaman.

Aurelia jalan di bawah radar. Ia berasal dari ruang yang sama dengan Angular, tapi punya cara sendiri memandang HTML, class, dan binding.

Yang saya bawa pulang dari perjalanan ini: framework ikut membentuk cara tim berpikir, cara orang baru bergabung, dan biaya yang dibayar bertahun-tahun kemudian.

Itu jarang masuk dalam perbandingan singkat di internet.

Buat yang bekerja di tim atau memegang keputusan teknis, ini bahan obrolan yang lebih luas dari sekadar memilih library.

---

## Posting 4

Saya coba satu eksperimen setelah itu.

Saya penasaran apakah Aurelia bisa dipakai untuk seluruh aplikasi, sampai ke bagian yang tidak terlihat. Saya bangun satu dari awal. Tampilannya Aurelia 2. Servernya Hono. Datanya Postgres. Aturan validasinya ditulis sekali, lalu dipakai di dua tempat.

Depan dan belakang saya pisahkan. Aurelia mengurus apa yang dilihat orang. Hono mengurus permintaan yang masuk. Keduanya disambung lewat kontrak yang sama.

Yang paling saya perhatikan adalah konsekuensinya. Kalau aturan validasi ditulis dua kali, satu hari nanti pasti ada perbedaan. Kalau ditulis sekali, perbedaan itu tidak pernah muncul.

Waktu itu eksperimen ini masih berhenti di localhost. Saya belum tahu apakah akan saya lanjutkan.

---

## Posting 5

Eksperimen tadi akhirnya saya pasang di Vercel.

Yang jalan di sana bukan satu halaman contoh. Ada halaman depan yang dikirim sebagai HTML biasa, ada bagian aplikasi yang baru aktif kalau orang benar-benar butuh interaksi, dan ada server Hono yang melayani datanya.

Halaman depan sengaja dibuat tanpa membawa kode aplikasi. Orang yang cuma mampir tidak perlu mengunduh apa yang tidak dipakai. Alat pengukur halaman Google memberi angka 100 untuk empat kategori sekaligus, dan isi utamanya muncul dalam sekitar satu detik di mobile.

Saya juga mengosongkan database produksi dari data contoh. Orang yang mau mencoba harus mendaftar seperti biasa.

Tautan repo saya taruh di komentar pertama, untuk yang ingin membaca sendiri.

Dari seluruh perjalanan ini saya ambil satu hal. Teknologi yang tidak sedang ramai dibicarakan tetap bisa dipelajari, tetap bisa dipakai, dan tetap bisa menghasilkan sesuatu yang bisa ditunjukkan.

---

## Yang belum masuk

Topik yang lebih dalam, seperti cara memisahkan tenant di satu middleware, beda antara 401 dan 403, atau adapter SSR di atas Web Standards, sengaja ditahan dulu. Ia baru relevan kalau ada yang bertanya setelah kelima posting ini.
