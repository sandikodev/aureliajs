# Aurelia 2 Universal Polyglot Bridge Example

> **Zero Glue Code. Pure Convention. Seamless Polyglot Interop.**  
> Membuktikan bagaimana `@aureliajs/bridge` menyederhanakan rekomendasi dokumentasi resmi Aurelia 2 yang serba manual menjadi deklaratif murni berbasis *Convention over Configuration*.

---

## 🏛️ Mengapa Contoh Ini Dibuat?

Dokumentasi resmi Aurelia 2 (*"React inside Aurelia"*, *"Vue inside Aurelia"*, *"Svelte inside Aurelia"*) menyuruh developer membuat file wrapper manual:
- Menulis `react-wrapper.ts`, `vue-wrapper.ts`, `svelte-wrapper.ts`
- Mengatur manual lifecycle `createRoot`, `flushSync`, `shallowReactive`, `markRaw`, `mount()`, dan `unmount()`
- Mengelola binding dua arah secara imperatif

Di dalam contoh ini, **seluruh kerumitan manual di atas dieliminasi 100%**:

```html
<!-- Cukup Satu Elemen Deklaratif Aurelia Murni -->
<au-bridge 
  using="react" 
  component.bind="ReactCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="vue" 
  component.bind="VueCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>

<au-bridge 
  using="svelte" 
  component.bind="SvelteCounter" 
  value.bind="sharedCounter" 
  on-change.bind="handleCounterUpdate">
</au-bridge>
```

---

## 🚀 Fitur Utama

1. **6 Framework Serentak dalam 1 Layar:**
   - **React 19.3** (`counter.react.tsx`)
   - **Vue 3.5 SFC** (`counter.vue`)
   - **Svelte 5 Runes** (`counter.svelte`)
   - **SolidJS 1.9** (`counter.solid.tsx`)
   - **Preact 11.2** (`counter.preact.tsx`)
   - **Qwik 1.20** (`counter.qwik.tsx`)
2. **Sinkronisasi Reaktif Dua Arah (Two-Way Reactive State):**
   - Perubahan nilai dari tombol di dalam React, Vue, atau Svelte langsung menyinkronkan property `sharedCounter` pada ViewModel Aurelia `MyApp`, dan secara otomatis memicu pembaruan ke framework lainnya.
3. **Enterprise Inversion of Control (IoC):**
   - Mendemonstrasikan DI container standar kelas enterprise via `@resolve(IEnterpriseOrderService)` yang identik dengan Spring Boot atau ASP.NET Core.

---

## 🛠️ Menjalankan Contoh

```bash
# 1. Jalankan Unit Test
bun test

# 2. Jalankan Vite Dev Server
bun run dev
```
