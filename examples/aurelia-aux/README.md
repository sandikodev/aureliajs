# Aurelia 2 Single-File Component (`.aux`) Example

> **Zero Boilerplate Single-File Components for Aurelia 2**  
> Menggunakan compiler `@aureliajs/vite-plugin-aux` untuk menggabungkan `<template>`, `<script setup>`, `<script server>`, dan `<style scoped>` dalam satu file `.aux`.

---

## 🏛️ Fitur Single-File Component (.aux)

1. **`<script setup>`:**
   - Variabel tingkat atas otomatis menjadi properti ViewModel reaktif.
   - Fungsi tingkat atas otomatis menjadi metode ViewModel untuk event binding (`click.trigger="refresh()"`).
2. **`<script server>`:**
   - Dieksekusi secara eksklusif saat SSR untuk server data loader (`static async loader()`) dan title halaman.
   - Dihapus 100% (*zero footprint*) dari bundle client browser!
3. **Execution Boundaries:**
   - Mendukung `<template client-only>` dan `<template server-only>`.
   - Mendukung `<template island="visible">` untuk selective hydration.

---

## 🛠️ Menjalankan Contoh

```bash
# 1. Jalankan Unit Test
bun test

# 2. Jalankan Typecheck
bun run typecheck

# 3. Jalankan Vite Dev Server
bun run dev
```
