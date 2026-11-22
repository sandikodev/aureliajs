# The Angular-Aurelia Heritage: Sejarah, Semantik, dan Rekonsiliasi Mental Model Frontend
### Mengapa Aurelia Terasa Asing bagi Warga React, Vue, Flutter, dan Svelte — dan Bagaimana Akar Sejarahnya Bertemu Kembali dengan Qwik

> **Penulis**: Sandikodev (@sandikodev)  
> **Konteks**: Riset Historis, Analisis Komparatif Semantik, dan Dokumen Pembelajaran Komunitas  
> **Dokumen Pendamping**: [The Resumable Frontier](the-resumable-frontier.md) & [The Reactive Continuum](the-reactive-continuum.md)  
> **Repositori**: `/home/dev/project/aureliajs`

---

## Daftar Isi
1. [Prolog: Akar Keterasingan (Cognitive Dissonance) Developer Modern](#1-prolog-akar-keterasingan-cognitive-dissonance-developer-modern)
2. [Sejarah yang Jarang Diketahui: Rob Eisenberg, Google, dan Kelahiran Aurelia](#2-sejarah-yang-jarang-diketahui-rob-eisenberg-google-dan-kelahiran-aurelia)
3. [Dekomposisi Mental Model: Mengapa Dunia React, Vue, Flutter, dan Svelte Kaget?](#3-dekomposisi-mental-model-mengapa-dunia-react-vue-flutter-dan-svelte-kaget)
4. [Bedah Komparasi Semantik: Angular vs. Aurelia 2 (Head-to-Head)](#4-bedah-komparasi-semantik-angular-vs-aurelia-2-head-to-head)
5. [Pemberontakan Aurelia: Singkirkan Zone.js, Rengkuh Web Standards & Direct DOM](#5-pemberontakan-aurelia-singkirkan-zonejs-rengkuh-web-standards--direct-dom)
6. [Benang Merah Historis: Hubungan Rob Eisenberg, Miško Hevery, dan Visi Resumability Sandikodev](#6-benang-merah-historis-hubungan-rob-eisenberg-miško-hevery-dan-visi-resumability-sandikodev)
7. [Rangkuman Pelajaran Intuitif bagi Sandikodev dan Komunitas](#7-rangkuman-pelajaran-intuitif-bagi-sandikodev-dan-komunitas)

---

## 1. Prolog: Akar Keterasingan (Cognitive Dissonance) Developer Modern

Ketika seorang developer yang sehari-hari hidup di ekosistem **React (JSX/TSX)**, **Vue**, **Svelte**, **Flutter (Dart)**, atau **Astro** pertama kali melihat kode Aurelia, reaksi spontan yang muncul hampir selalu seragam:

> *"Lho, kok filenya terpisah jadi `.ts` dan `.html`? Kok ada `@customElement`, `@bindable`, dan `resolve()`? Sintaks `.bind` dan `repeat.for` ini dari mana asalnya? Mengapa tidak pakai JSX atau Single-File Component saja?"*

Bagi developer yang tumbuh besar di era dominasi React dan Vue (2016–sekarang), struktur ini terasa seperti "upacara enterprise" yang kaku dan asing.

Namun, perhatikan fenomena sebaliknya:  
**Seorang developer yang memiliki latar belakang AngularJS (1.x) atau Angular (2+) yang masuk ke Aurelia tidak akan merasa asing sama sekali.** Mereka akan langsung tersenyum dan berkata:
> *"Ini konsep yang sangat saya kenal! Ada Dependency Injection, ada Class ViewModel, ada template HTML terpisah dengan binding eksplisit. Tapi anehnya... ini jauh lebih bersih, tidak ada `NgModule`, tidak ada `@Injectable({ providedIn: 'root' })` yang rumit, dan tidak ada `zone.js` yang memperlambat browser!"*

Mengapa fenomena ini terjadi? Mengapa Aurelia terasa begitu mirip dengan Angular secara semantik dan filosofis, namun terasa asing bagi warga React, Svelte, dan Flutter?

Jawabannya bukan kebetulan semata. Jawabannya berakar pada sebuah **drama sejarah rekayasa perangkat lunak di tahun 2014 antara Rob Eisenberg dan Google**.

---

## 2. Sejarah yang Jarang Diketahui: Rob Eisenberg, Google, dan Kelahiran Aurelia

Untuk benar-benar memahami Aurelia, kita harus memutar waktu ke era keemasan awal Single Page Application (2012–2015).

```
[2012 - Durandal] 
  Dibuat oleh Rob Eisenberg (Knockout + RequireJS).
  Salah satu framework SPA pertama di dunia yang paling elegan.
         ↓
[Awal 2014 - Dipinang Google] 
  Google merekrut Rob Eisenberg untuk masuk ke Tim Inti Angular.
  Tugas: Merancang arsitektur masa depan "Angular 2".
         ↓
[Pertengahan 2014 - Benturan Filosofi di Google]
  Rob Eisenberg: Ingin Angular 2 berbasis Standar Web murni (ES6/ES7),
  Convention over Configuration, dan minim tooling proprietary.
  Tim Google: Memilih pendekatan enterprise berat, AtScript, TypeScript custom,
  Zone.js, compiler proprietary, dan dekorator rumit.
         ↓
[Desember 2014 - Rob Eisenberg Mundur dari Google]
  Rob mengumumkan pengunduran dirinya dari tim Angular 2.
         ↓
[Januari 2015 - Kelahiran Aurelia]
  Rob Eisenberg merilis Aurelia: "Visi sesungguhnya tentang bagaimana
  seharusnya Angular 2 dibangun jika setia pada Standar Web."
```

### Kisah di Balik Layar: Rob Eisenberg & Angular 2
Pada tahun 2012–2013, sebelum Angular mendominasi, **Rob Eisenberg** menciptakan framework bernama **Durandal**. Durandal adalah mahakarya pada zamannya—mengawinkan two-way data-binding KnockoutJS dengan modularitas RequireJS, menghasilkan pola Model-View-ViewModel (MVVM) yang sangat bersih.

Melihat kejeniusan Durandal, tim Google yang sedang memelihara AngularJS (1.x) menghubungi Rob. AngularJS 1.x saat itu sudah mulai menua, lambat karena *dirty-checking digest loop*, dan memiliki terlalu banyak konsep membingungkan (`$scope`, `directive link function`, `transclude`, `$apply`). Google memutuskan membuat ulang total: **Angular 2**.

Rob Eisenberg resmi diajak bergabung ke dalam tim inti Angular di Google bersama **Miško Hevery** (pencipta AngularJS), Brad Green, dan Igor Minar. Rob membawa seluruh ide cemerlang dari Durandal untuk merancang fondasi Angular 2.

### Titik Pecah di Mountain View (2014)
Namun di dalam Google, terjadi benturan filosofi arsitektural yang sangat mendasar:
1. **Visi Rob Eisenberg**:
   Rob menginginkan framework generasi baru yang **100% selaras dengan standar web masa depan (W3C dan TC39)**:
   - Menggunakan kelas ES6 murni tanpa *framework lock-in*.
   - Konvensi penamaan yang cerdas (*convention over configuration*): jika ada `my-card.ts` dan `my-card.html`, otomatis berpasangan tanpa perlu konfigurasi metadata yang berulang-ulang.
   - Menghindari modifikasi monkey-patching pada API browser.
2. **Visi Tim Google Angular**:
   Google adalah raksasa enterprise dengan ribuan engineer internal. Mereka menginginkan:
   - Bahasa baru khusus buatan Google bernama **AtScript** (yang kemudian dimerger ke TypeScript).
   - Abstraksi modul enterprise (`NgModule`).
   - Sistem deteksi perubahan otomatis menggunakan monkey-patch global: **Zone.js**.
   - Metadata eksplisit yang sangat banyak dan bertele-tele di setiap komponen.

Merasa bahwa visi kesederhanaan dan standar web murni tidak lagi diakomodasi di Google, **pada akhir tahun 2014 Rob Eisenberg memutuskan mengundurkan diri secara terhormat dari tim Angular Google**.

Satu bulan kemudian, pada **Januari 2015**, Rob Eisenberg merilis **Aurelia**.  
Aurelia pada dasarnya adalah perwujudan dari:  
> *"Inilah framework yang seharusnya menjadi Angular 2 jika Google tidak terjebak dalam birokrasi dan kompleksitas enterprise."*

Itulah alasan ilmiah dan historis mengapa **Aurelia memiliki kemiripan semantik dan DNA yang sangat dekat dengan Angular**, karena perancang utamanya adalah orang yang sama!

---

## 3. Dekomposisi Mental Model: Mengapa Dunia React, Vue, Flutter, dan Svelte Kaget?

Bagi Sandikodev dan rekan-rekan engineer yang mendalami hal ini, penting untuk memetakan bagaimana pikiran seorang developer bekerja saat berpindah ekosistem:

```
┌────────────────────────────────────────────────────────────────────────┐
│ MENTAL MODEL 1: THE JAVASCRIPT-CENTRIC (React, Flutter)                │
│ • UI adalah kode JavaScript/Dart: UI = f(state).                       │
│ • Markup (JSX) atau Widget Tree bersarang di dalam fungsi logika.      │
│ • State berubah -> Fungsi komponen dieksekusi ulang dari atas ke bawah.│
│ • Shock saat bertemu Aurelia: "Mana fungsi render-nya? Kok HTML-nya    │
│   berada di luar JS?"                                                  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ MENTAL MODEL 2: THE SINGLE-FILE / RUNES COMPILER (Vue, Svelte, Astro)  │
│ • Komponen adalah satu file (.vue, .svelte, .astro).                   │
│ • Kompiler mengubah sintaks khusus menjadi panggilan reaktif.          │
│ • Shock saat bertemu Aurelia konvensional: "Kenapa harus buat dua file │
│   (.ts dan .html) hanya untuk membuat tombol kecil berukuran 5 baris?" │
│   (Inilah alasan mengapa Sandikodev menciptakan inovasi SFC .aux!)     │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ MENTAL MODEL 3: THE ENTERPRISE CLASS & DI (Angular, NestJS, Aurelia)   │
│ • Komponen adalah class dengan lifecycle method (attached, detached).  │
│ • State adalah properti class; Method adalah event handler.            │
│ • Layanan (services) disuntikkan via Dependency Injection (DI).        │
│ • Template adalah dokumen HTML semantik yang mendeklarasikan binding.  │
│ • Reaksi saat bertemu Aurelia: "Aha! Ini Angular yang bersih dan cepat!│
└────────────────────────────────────────────────────────────────────────┘
```

### Keterasingan Warga React (JSX):
Di React, komponen adalah fungsi murni:
```tsx
// React: Fungsi dieksekusi ulang berulang kali
export function UserProfile({ name }) {
  const [active, setActive] = useState(false);
  return <div onClick={() => setActive(!active)}>{name}</div>;
}
```
Ketika warga React melihat Aurelia, mereka kaget karena:
1. Class `UserProfile` di Aurelia **hanya diinstansiasi SATU KALI**.
2. Tidak ada re-running fungsi komponen.
3. Properti diubah langsung (`this.active = !this.active`), dan Aurelia secara presisi hanya memperbarui node DOM yang terkait tanpa menyentuh node lainnya.

### Keterasingan Warga Flutter (Dart):
Di Flutter, seluruh layout diatur oleh pohon kelas widget:
```dart
// Flutter: Semua markup adalah class Dart
Widget build(BuildContext context) {
  return GestureDetector(
    onTap: () => setState(() => active = !active),
    child: Text(name),
  );
}
```
Warga Flutter terbiasa dengan strongly-typed OOP, tetapi canggung karena template Aurelia diekspresikan dalam HTML berbasis string, bukan kode TypeScript imperatif.

### Keterasingan Warga Vue & Svelte:
Warga Vue dan Svelte sudah akrab dengan template HTML. Namun mereka terbiasa memiliki `<script>`, `<template>`, dan `<style>` dalam **satu berkas tunggal**. Konvensi lama Aurelia yang memisahkan `.ts` dan `.html` memicu *file navigation fatigue*.

👉 **Inilah celah emas yang dipecahkan oleh inovasi format `.aux` yang dikembangkan Sandikodev di monorepo ini!** Format `.aux` membawa kemudahan SFC ala Svelte/Astro langsung ke atas mesin Direct-DOM Aurelia 2.

---

## 4. Bedah Komparasi Semantik: Angular vs. Aurelia 2 (Head-to-Head)

Mari kita buktikan secara semantik betapa dekatnya sintaks Aurelia dengan Angular, namun betapa Aurelia jauh lebih bersih dan manusiawi:

### A. Binding Properti & Nilai
| Kebutuhan | Angular (2+) | Aurelia 2 | Filosofi Aurelia |
| :--- | :--- | :--- | :--- |
| **One-way Data Binding** | `<input [value]="userName">` | `<input value.to-view="userName">` atau `value.bind` | Menggunakan kata kerja bahasa Inggris yang eksplisit, bukan kurung siku membingungkan `[]` |
| **Two-way Data Binding** | `<input [(ngModel)]="userName">` *(Banana in a box)* | `<input value.two-way="userName">` atau `value.bind` | Mengeliminasi sintaks aneh `[()]`; cukup gunakan `.bind` (Aurelia otomatis tahu elemen `<input>` membutuhkan two-way) |
| **Event Binding** | `<button (click)="save()">` | `<button click.trigger="save()">` | `.trigger` bekerja langsung di atas standar W3C DOM Event dispatching |

### B. Template Controllers (Iterasi & Kondisional)
| Fitur | Angular (2+) | Aurelia 2 | Catatan Semantik |
| :--- | :--- | :--- | :--- |
| **Kondisional (IF)** | `<div *ngIf="isLoggedIn">...</div>` | `<div if.bind="isLoggedIn">...</div>` | Menggunakan atribut standar `.bind`, bukan bintang `*` yang memerlukan de-sugaring compiler khusus |
| **Iterasi (List)** | `<li *ngFor="let item of items">{{ item.name }}</li>` | `<li repeat.for="item of items">${item.name}</li>` | Mengadopsi sintaks perulangan standar JavaScript ES6 `for...of` dan string template `${...}` native |

### C. Dependency Injection (DI)
**Angular**:
```typescript
@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent {
  constructor(private authService: AuthService) {}
}
```

**Aurelia 2**:
```typescript
import { resolve } from 'aurelia';

export class UserComponent {
  private readonly authService = resolve(AuthService);
}
```
Di Aurelia 2, Anda tidak perlu mengulang-ulang `selector`, `templateUrl`, dan `styleUrls` jika menggunakan konvensi nama yang sama. Dan dengan hadirnya fungsi `resolve(AuthService)` modern, DI di Aurelia selaras dengan fungsi inject standar TC39 tanpa ketergantungan pada decorator parameter yang usang.

---

## 5. Pemberontakan Aurelia: Singkirkan Zone.js, Rengkuh Web Standards & Direct DOM

Perbedaan paling fundamental antara Angular dan Aurelia bukan pada sintaks tampilan, melainkan **apa yang terjadi di balik layar (under the hood)**:

```
[ANGULAR]
Event Terjadi (misal: tombol diklik)
       ↓
Zone.js mencegat (Monkey-patches window.addEventListener, setTimeout, fetch, dll.)
       ↓
Zone.js memicu Change Detection di SELURUH POHON KOMPONEN DARI ROOT
       ↓
Evaluasi dirty check pada setiap binding apakah nilai berubah
       ↓
Update DOM
(Overhead runtime besar, sulit didebug saat asynchronous boundary terputus)
```

Bandingkan dengan mekanisme Aurelia:

```
[AURELIA 2]
Event Terjadi (click.trigger="updateName()")
       ↓
Browser mengeksekusi handler native standar tanpa Zone.js
       ↓
Properti 'name' pada class berubah: this.name = "Budi"
       ↓
ObserverLocator (Getter/Setter / Proxy Observer) mendeteksi secara bedah
       ↓
HANYA node DOM teks "${name}" yang diperbarui seketika itu juga!
(Zero Virtual DOM, Zero Monkey-patching, Performa setara kompilasi C++)
```

Inilah alasan mengapa Rob Eisenberg memberontak: **Web platform sudah menyediakan API yang luar biasa tangguh**. Tidak perlu membungkus browser dengan runtime seberat `Zone.js` jika kita memahami cara kerja getter, setter, dan event dispatching W3C secara benar.

---

## 6. Benang Merah Historis: Hubungan Rob Eisenberg, Miško Hevery, dan Visi Resumability Sandikodev

Di sinilah lingkaran sejarah ini tertutup dengan sangat indah, dan membuktikan mengapa ambisi Sandikodev mengawinkan **Aurelia 2** dengan **konsep Resumable Qwik** bukanlah lamunan acak, melainkan sintesis arsitektural yang berakar kuat:

```
                       [GOOGLE ANGULAR TEAM (2014)]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
   [ROB EISENBERG]                                     [MIŠKO HEVERY]
   Mencari kemurnian Web Standards,                    Menyadari cacat mendasar
   Direct DOM, dan arsitektur kelas elegan.            siklus Hidrasi di seluruh framework.
           ↓                                                   ↓
   Menciptakan AURELIA (2015)                          Menciptakan QWIK (2021)
   (Pondasi Direct-DOM non-VDOM tercepat)              (Konsep Resumability & Zero-JS TTI)
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     │
                                     ▼
                [LAB RISET SANDIKODEV: THE RESUMABLE FRONTIER]
                • Mengambil Direct DOM & Class Model Aurelia (Warisan Rob)
                • Memberikan DX HTML SFC .aux (Inspirasi Svelte/Astro)
                • Mengawinkannya dengan Eksekusi Resumable (Warisan Miško)
                • Dijalankan di atas Runtime Edge Ultra-Ringan (Hono)
```

1. **Miško Hevery** (bapak AngularJS) setelah meninggalkan Google menyadari bahwa hidrasi adalah dosa terbesar arsitektur web modern, lalu ia menciptakan **Qwik** untuk melahirkan era *Resumability*.
2. **Rob Eisenberg** (bapak Durandal & Aurelia) setelah meninggalkan Google membuktikan bahwa Virtual DOM adalah abstraksi yang tidak perlu jika kita bekerja langsung di atas standar W3C.
3. **Sandikodev**: Menghubungkan kedua mahakarya tersebut di laboratorium repositori ini. Karena Aurelia sejak awal **TIDAK memakai Virtual DOM**, Aurelia adalah substrate yang paling fleksibel di dunia untuk dievolusikan dari hidrasi konvensional menuju **Resumable Fine-Grained Execution**!

---

## 7. Rangkuman Pelajaran Intuitif bagi Sandikodev dan Komunitas

Dari telaah sejarah dan arsitektur ini, kita dapat menarik kesimpulan praktis untuk pegangan belajar dan pengembangan ke depan:

1. **Jangan Minder Jika Merasa Asing di Awal**:  
   Keterasingan saat menyentuh Aurelia bagi developer React, Vue, Flutter, atau Svelte adalah hal yang lumrah. Anda sedang melihat paradigma *Enterprise Web Standards* yang berakar dari arsitektur Angular/Durandal, bukan paradigma *Functional Re-rendering* ala React.
2. **Kekuatan Terbesar Aurelia Adalah Ketahanannya terhadap Waktu**:  
   Framework yang bergantung pada tren syntax proprietary (seperti JSX khusus atau compiler unik) sering usang ketika tren berganti. Aurelia bertahan bukan karena JavaScript murni yang ambigu—melainkan karena ketaatannya pada **spesifikasi kontrak kelas TypeScript yang ketat (strict typing), standar W3C Custom Elements, dan deklarasi HTML semantik**. Kerapian kontrak ini menjauhkannya dari perangkap ambigu dan kelemahan runtime dynamic JavaScript yang sering dihindari engineer berpengalaman (baca: [The Web Substrate Paradox: Anatomi Kelahiran Prematur JavaScript](the-javascript-fallacy.md)).
3. **Inovasi `.aux` Adalah Jembatan Alternatif Ergonomis**:  
   Format Single-File Component `.aux` yang dieksplorasi di laboratorium ini bukan hadir untuk mendiskreditkan atau mengganti konvensi dual-file resmi yang dibanggakan komunitas Aurelia, melainkan membuka pintu alternatif ergonomis baru bagi developer yang menyukai kesatuan berkas ala Svelte dan Astro tanpa harus meninggalkan kecepatan dan keandalan Direct-DOM Aurelia.
4. **Resumability Adalah Titik Temu Tertinggi**:  
   Menatap masa depan bersama Qwik bukan berarti membuang Aurelia. Justru dengan memanfaatkan parser ekspresi AST Aurelia dan mekanisme penanda komentar `<!--au-->`, kita sedang meletakkan batu bata untuk menciptakan framework non-VDOM pertama yang benar-benar **resumable**.

---

*Dokumen ini merupakan catatan riset resmi oleh Sandikodev (@sandikodev).*  
*Dipersilakan membagikan dan mendiskusikan dokumen ini untuk kemajuan bersama ekosistem rekayasa web terbuka.*
