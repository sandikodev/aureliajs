# Aurelia 2 Universal Polyglot Bridge Example

> **Zero Glue Code. Pure Convention. Seamless Polyglot Interop & Hypermedia.**  
> Membuktikan bagaimana `@aureliajs/bridge` menyederhanakan rekomendasi dokumentasi resmi Aurelia 2 yang serba manual menjadi deklaratif murni berbasis *Convention over Configuration*.

---

## 🏛️ Mengapa Contoh Ini Dibuat?

Dokumentasi resmi Aurelia 2 (*"React inside Aurelia"*, *"Vue inside Aurelia"*, *"Svelte inside Aurelia"*) menyuruh developer membuat file wrapper manual:
- Menulis `react-wrapper.ts`, `vue-wrapper.ts`, `svelte-wrapper.ts`
- Mengatur manual lifecycle `createRoot`, `flushSync`, `shallowReactive`, `markRaw`, `mount()`, dan `unmount()`
- Mengelola binding dua arah secara imperatif

Di dalam repositori ini, **seluruh kerumitan manual di atas dieliminasi 100%**:

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

## 🚀 Fitur Utama & Contoh Penggunaan

### 1. Enam Framework Serentak dalam Satu Aplikasi Aurelia 2
Mendukung interoperabilitas komponen kelas satu untuk 6 framework modern:
- **React 19.3** (`src/components/frontend/counter.react.tsx`)
- **Vue 3.5 SFC** (`src/components/frontend/counter.vue`)
- **Svelte 5 Runes** (`src/components/frontend/counter.svelte`)
- **SolidJS 1.9** (`src/components/frontend/counter.solid.tsx`)
- **Preact 11.2** (`src/components/frontend/counter.preact.tsx`)
- **Qwik 1.20** (`src/components/frontend/counter.qwik.tsx`)

Setiap komponen di-mount secara otomatis melalui `<au-bridge using="...">` tanpa perlu file wrapper manual.

---

### 2. Komposisi Ortogonal dengan `@aureliajs/islands` (`island="..."`)

Saat dikombinasikan dengan paket [`@aureliajs/islands`](../../packages/aurelia-islands), runtime library foreign (seperti React 19 atau Vue 3) **sama sekali tidak diunduh maupun di-mount** sebelum pemicu (*trigger*) aktif di browser:

```html
<!-- Zero Foreign Runtime sampai elemen terlihat di viewport (IntersectionObserver) -->
<au-bridge 
  island="visible" 
  using="react" 
  loader.bind="() => import('./heavy-chart.react')" 
  props.bind="chartData">
</au-bridge>

<!-- Defer mounting saat browser berada dalam kondisi idle (requestIdleCallback) -->
<au-bridge 
  island="idle" 
  using="vue" 
  component.bind="ChatWidget" 
  props.bind="userSession">
</au-bridge>

<!-- Mount hanya pada layar desktop (CSS Media Query) -->
<au-bridge 
  island="media" 
  data-au-media="(min-width: 1024px)" 
  using="svelte" 
  component.bind="DesktopSidebar">
</au-bridge>
```

> **Catatan Disiplin Arsitektural**:
> - `@aureliajs/bridge` berfokus pada **interoperabilitas komponen** (*apa* yang di-mount dan *bagaimana* state disinkronkan).
> - `@aureliajs/islands` berfokus pada **scheduling selective hydration** (*kapan* elemen diaktifkan).
> - Keduanya terpisah tegas secara modular dan dapat digabungkan secara ortogonal.

---

### 3. Hypermedia Native: Integrasi HTMX 2.0 via `au-htmx`

Selain komponen berbasis JavaScript, `@aureliajs/bridge` menyediakan Custom Attribute **`au-htmx`** untuk menghubungkan arsitektur hypermedia murni ke dalam pohon DOM Aurelia 2 tanpa wrapper component:

```html
<!-- Memproses seluruh atribut HTMX secara native pada elemen host -->
<div au-htmx>
  <button 
    class="btn btn-primary" 
    hx-get="/api/htmx-demo" 
    hx-target="#htmx-result" 
    hx-swap="innerHTML">
    ⚡ Muat Live Fragment Server (hx-get)
  </button>
  <div id="htmx-result">
    <!-- Konten server akan di-swap langsung ke sini -->
  </div>
</div>
```

---

### 4. Sinkronisasi Reaktif Dua Arah (Two-Way Reactive State)

Komunikasi dua arah berlangsung mulus tanpa boilerplate:
- **Aurelia → Foreign**: Cukup ikat `value.bind="sharedCounter"` atau `props.bind="{ ... }"`. Saat state di ViewModel Aurelia berubah, adapter bridge memicu `update(nextProps)`.
- **Foreign → Aurelia**: Tombol di dalam komponen React, Vue, Svelte, Solid, Preact, atau Qwik memanggil `onCounterChange`, `onChange`, atau menembakkan `bridge-event`. Aurelia langsung memperbarui ViewModel dan menyinkronkan ke seluruh framework lainnya seketika!

---

### 5. Enterprise Inversion of Control (IoC) & DI

Mendemonstrasikan hierarki Dependency Injection standar kelas enterprise via API `@resolve(IEnterpriseOrderService)` yang identik dengan Spring Boot (`@Autowired`), ASP.NET Core, atau NestJS:

```ts
import { customElement, resolve } from 'aurelia';
import { IEnterpriseOrderService } from './services/enterprise-order.service';

@customElement({ name: 'my-app', template })
export class MyApp {
  // Inject service singleton via IoC Container
  private orderService = resolve(IEnterpriseOrderService);

  public orders = this.orderService.getOrders();
}
```

---

## 🛠️ Menjalankan Proyek

```bash
# 1. Jalankan Unit & Integration Tests (158 Monorepo Tests Passing)
bun test

# 2. Jalankan Vite Development Server
bun run dev
```

Buka `http://localhost:5173` di browser Anda untuk melihat 6 framework dan HTMX beroperasi harmonis di dalam Aurelia 2!
