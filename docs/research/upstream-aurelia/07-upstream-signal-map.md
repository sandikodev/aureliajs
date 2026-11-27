# Peta sinyal upstream: apa yang sebenarnya dibuka maintainer

Catatan ini hasil pembacaan artefak GitHub per 28 November 2026. Bukan kesimpulan final, dan bukan izin untuk mengirim PR. Tujuannya supaya kita berhenti membaca semua issue open sebagai undangan kerja.

## Pertama, koreksi pada pembacaan saya sendiri

Beberapa nomor yang saya sebut "issue aktif" di dokumen sebelumnya ternyata PR: `#2574` (transfer state), `#2560` (defer), `#2559` (head management), `#2565` (error boundaries), `#2479` (router URL). Semua masih open, bukan draft, dan ditulis Vheissu atau fkleuver. Issue aslinya adalah pasangan seperti `#2535`, `#2544`, `#2546`, `#2542`.

Ini bukan sekadar salah label. Issue dan PR punya makna sosial berbeda di repo ini. Issue adalah catatan audit yang dipetakan maintainer; PR adalah implementasi yang sudah ia pegang. Mencampur keduanya membuat saya mengira ada lebih banyak ruang untuk ikut campur daripada yang sebenarnya ada.

## Apa yang terlihat dari artefak

Vheissu membuka sekitar 60 issue dalam satu batch akhir September 2026, hampir semuanya dengan pola sama: judul deskriptif, tabel ukuran, repro, dan proposal perbaikan. Banyak yang ditutup dengan kalimat "Found during an SSR audit of master @199641af7a." Beberapa di-assign ke dirinya sendiri (`#2546`, `#2542`, `#2535`), beberapa sudah ditautkan ke PR (`#2533` ke `#2563` yang sudah merge, `#2534`/`#2535`/`#2531` ke `#2574`).

Saya tidak menemukan satu pun label `help wanted`, `good first issue`, `needs repro`, atau `PR welcome` pada issue open. Bisa jadi keterbatasan pencarian GitHub, tapi pola ini konsisten dengan isu-isu yang saya baca satu per satu: tidak ada yang meminta bantuan luar.

Sinyal paling kuat justru ada di kata-kata maintainer. Untuk error boundary, fkleuver menulis di `#2542` bahwa ia ingin menyimpan issue itu untuk review khusus setelah Aurelia 2 GA, dengan `#2565` sebagai titik awal implementasi, dan bahwa untuk GA ia ingin memprioritaskan kebenaran perilaku lifecycle yang sudah ada. Kalimat serupa ada di `#2565`, `#2560`, dan `#2542`: post-GA, bukan sekarang. Milestone `v2.x` di sini berarti parkir, bukan segera dikerjakan.

Pengecualian yang saya cek adalah `#2199`, satu-satunya issue berlabel RFC. Issue itu dibuka Vheissu tahun 2025, sudah di-assign, dan sudah didiskusikan komunitas. Tanggapannya sebagikan besar menolak, termasuk suara yang meminta AU2 diselesaikan dulu dan RFC baru ditunda. Jadi label RFC pun tidak otomatis berarti pintu terbuka.

## Yang tumpang tindih dengan pekerjaan kita

Ini bagian yang paling relevan untuk kita, tapi juga paling mudah disalahgunakan.

- `#2537` incremental hydration dan pre-hydration event replay. Belum ada assignee, belum ada PR. Ini paling dekat dengan `@aureliajs/islands`.
- `#2535` transfer server state, sudah di-assign Vheissu dan punya PR `#2574`.
- `#2534` app stability API, tertaut ke PR yang sama.
- `#2533` mismatch detection, sudah ditutup oleh PR `#2563` yang merged 5 November.
- `#2531`, `#2530`, `#2528`, `#2527` masalah hidrasi lain, belum ada PR yang saya temukan.

Artinya packages kita sudah membuktikan beberapa ide yang oleh maintainer sudah dicatat dan sebagian sudah diimplementasikan. Ini bisa jadi modal kredibilitas, tetapi bukan alasan untuk masuk dan mengatakan "kami sudah punya implementasinya". Itu akan terbaca sebagai tuntutan, apalagi kalau datang setelah issue LinkeDOM kita.

## Blindspot saya

Saya perlu mencatat ini supaya tidak mengulanginya.

Pertama, saya membaca daftar issue seperti antrean tugas. Padahal ini catatan audit satu orang yang sedang merapikan utang teknisnya sendiri. Kecenderungan saya membuat tabel rapi justru memperkuat kesalahan itu: semua tampak sejajar, padahal statusnya berbeda-beda.

Kedua, saya mengira issue yang baru disentuh berarti maintainer tertarik. `#2494` dan `#2588` sama-sama punya `updatedAt` 27 November, tapi yang menyentuh adalah komentar kita. Itu bukan aktivitas maintainer.

Ketiga, saya hampir menganggap manifesto reformasi kita sebagai bekal yang bisa dibawa ke diskusi upstream. Menurut saya sekarang, manifesto itu berguna sebagai batas internal untuk packages kita, bukan sebagai pesan untuk Aurelia. Di mata maintainer, nada "kita yang akan merapikan ekosistem" mudah terbaca sebagai instruksi dari luar. Saya tidak setuju kalau dokumen itu dipakai sebagai argumen upstream, meski isinya banyak yang benar untuk kita.

Keempat, saya terlalu cepat menyamakan "analisis mendalam" dengan "sudo otomatis boleh maju". Analisis yang benar justru sering berujung pada keputusan untuk tidak maju. Itu yang terjadi di sini.

## Yang dikatakan panduan resmi

Contributor guide Aurelia membedakan dua jalur. Perubahan kecil boleh langsung PR, dengan test dan changeset bila menyentuh package. Perubahan besar harus didiskusikan lewat RFC dulu, supaya mereka bisa "prevent duplication of work". Soal masuk core team, guide itu menyebut konsistensi kualitas dan kadensi dalam fixing bugs, docs, dan triage, bukan besarnya proposal.

Ini menjawab kegelisahan soal cara dilirik. Jalur yang ditempuh bukan menambah issue besar, melainkan kontribusi kecil yang terus-menerus dan mengurangi beban maintainer. Bukti bahwa jalur ini nyata: PR `#2584` dari kontributor luar merged 6 November, di tengah PR lain yang ditulis maintainer sendiri.

## Keputusan yang saya usulkan

Untuk sementara tidak ada aksi upstream lagi. Tidak ada edit pada `#2588`, tidak ada komentar lanjutan, tidak ada PR yang mengutip audit kita sebagai pembenaran.

Pekerjaan utama tetap di packages kita, karena di situlah bukti ada dan risikonya dikendalikan. Kalau kita ingin menambah jejak kontribusi upstream, bentuknya harus kecil dan terpisah dari narasi LinkeDOM maupun islands: satu bug konkret yang belum ada di audit Vheissu, belum di-assign, dan belum punya PR.Sebelum memilihnya, kita verifikasi dulu dengan repro lokal terhadap commit upstream yang dipakai submodule. Kalau repro itu tidak menambah informasi yang belum ada di issue, kita tidak mengirim apa-apa.

Draf C dan branch perbaikan upstream tetap ditahan.
