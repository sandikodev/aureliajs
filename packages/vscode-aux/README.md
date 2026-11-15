# AUX: Experimental Aurelia SFC (Community Lab)

<p align="center">
  <img src="./images/hero-banner.png" alt="Aurelia AUX - Next-Gen Single-File Components" width="100%" />
</p>

> **Sebuah Eksplorasi Ergonomi Developer Experience (DX) Komunitas untuk Aurelia 2**  
> *Oleh Sandiko ([@sandikodev](https://github.com/sandikodev))*

---

### 🕊️ Catatan Transparansi & Penghormatan Komunitas (Community Disclosure)

> **Tentang Otoritas & Otonomi Aurelia Resmi:**  
> Proyek format `.aux`, ekstensi editor ini, dan plugin bundler terkait adalah **inisiatif penelitian dan pengembangan eksperimental independen** yang dikerjakan oleh Sandiko (`sandikodev`) sebagai bagian dari komunitas developer Aurelia.
>
> Proyek ini **bukan rilis resmi** dari tim inti Aurelia maupun Aurelia Foundation.
> 
> Seluruh kebenaran kanonikal, arsitektur inti, standar desain, dan kepemimpinan ekosistem Aurelia sepenuhnya dan selamanya berada di bawah otoritas resmi **Rob Eisenberg, Aurelia Core Team, dan para maintainer resmi** di:
> - **Situs Resmi**: [aurelia.io](https://aurelia.io)
> - **Repositori Utama**: [github.com/aurelia](https://github.com/aurelia)
> - **Forum Komunitas**: [discourse.aurelia.io](https://discourse.aurelia.io)

---

### 💡 Latar Belakang & Visi Proyek

Aurelia 2 dirancang dengan prinsip reaktivitas yang luar biasa cepat, berbasis standar web terbuka, dan memiliki arsitektur modular yang sangat elegan. Selama ini, Aurelia mengusung konvensi pasangan file `.ts` (logic) dan `.html` (template). 

Namun, ketika membangun komponen UI yang padat dan granular (seperti tombol, badge, avatar, card), developer sering kali dihadapkan pada dua pilihan:
1. **Membuat pasangan 2 file terpisah** untuk setiap komponen kecil, yang dapat memecah fokus mental (*file fragmentation*).
2. **Menulis template HTML di dalam string backtick TypeScript** (`template: \`...\``), yang sangat buruk dari segi Developer Experience (DX), kotor, dan tidak memiliki type-checking template yang memadai.

Format **`.aux`** (**AU**relia + **X**HTML/XML) hadir sebagai **laboratorium eksperimen aktif** untuk menjembatani kebutuhan tersebut:
- Menyatukan `<template>`, `<script lang="ts">`, dan `<style scoped>` dalam **satu file tunggal yang kohesif**.
- Mengeliminasi string template backtick kotor dari kode TypeScript.
- Menjaga performa tetap 100% native tanpa overhead runtime tambahan.

**Tujuan Jangka Panjang**:  
Proyek ini bukan sekadar mainan, melainkan eksperimen nyata yang dibangun dengan disiplin teknik tinggi. Jika format dan tooling `.aux` ini setelah melalui proses pematangan dan pengujian terbukti berhasil menghadirkan DX yang unggul dan digemari oleh komunitas luas, seluruh hasil riset ini akan diajukan secara santun dan hormat sebagai bahan pertimbangan (RFC / upstream contribution) kepada tim inti Aurelia resmi.

---

### 🚀 Fitur Unggulan Ekstensi

- **Dukungan TypeScript Murni**:  
  Blok `<script lang="ts">` dievaluasi langsung oleh TypeScript Language Server sehingga terbebas dari peringatan palsu validator JavaScript (*"Type annotations can only be used in TypeScript files"*).
- **Aurelia Directive Highlighting**:  
  Menyorot secara presisi seluruh perintah binding Aurelia:
  - Commands: `.bind`, `.trigger`, `.for`, `.attr`, `.class`, `.style`, `.one-time`, `.two-way`.
  - Interpolasi string: `${expression}`.
- **Embedded CSS & Scoped Styles**:  
  Highlighting penuh untuk blok `<style>` dan `<style scoped>`.
- **Ikon File Khas (`.aux`)**:  
  File `.aux` di File Explorer VS Code kini memiliki ikon khusus bergradien violet-cyan khas Aurelia sehingga langsung dapat dibedakan dari file teks generik.
- **Auto-Closing & Bracket Matching**:  
  Mendukung penutupan otomatis tag HTML, komentar `<!-- -->`, dan bracket ekspresi.

---

### 📦 Anatomi Komponen `.aux`

```html
<template containerless>
  <div role="separator" class.bind="classes"></div>
</template>

<script lang="ts">
import { bindable } from 'aurelia';
import { cn } from '@/lib/utils';

export class UiSeparator {
  @bindable orientation: 'horizontal' | 'vertical' = 'horizontal';

  get classes(): string {
    return cn(
      'shrink-0 bg-border',
      this.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    );
  }
}
</script>

<style scoped>
div {
  transition: opacity 0.2s ease;
}
</style>
```

---

### 🤝 Dialog & Kolaborasi Komunitas

Kami sangat menyambut diskusi, masukan teknis, dan koreksi dari rekan-rekan pengembang maupun core maintainer Aurelia. Mari bersama-sama merawat ekosistem agar tetap inklusif, saling menghormati, dan produktif.

- **Penulis**: Sandiko ([@sandikodev](https://github.com/sandikodev))
- **Lisensi**: MIT
