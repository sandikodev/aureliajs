# Pure Aurelia 2 SSR Example

> **Zero HTTP Framework Coupling. Pure Native Aurelia 2 Server-Side Rendering.**  
> Membuktikan bagaimana `@aureliajs/ssr` bekerja sebagai engine SSR murni yang agnostik terhadap server HTTP (berjalan di atas native `Bun.serve`, Node `http.createServer`, Fastify, Express, atau edge workers) tanpa memerlukan wrapper Hono.

---

## 🏛️ Arsitektur Pure SSR

Aurelia 2 SSR memegang prinsip pemisahan tanggung jawab yang tegas:
1. **`@aureliajs/ssr`**: Engine murni yang menerima `component`, `props`, dan `context`, lalu mengembalikan string HTML terisolasi tanpa memutasi `globalThis`.
2. **Server HTTP Bebas**: Anda bebas memilih runtime backend apapun. Contoh ini menggunakan `Bun.serve` native standar W3C `Request` / `Response`.

```typescript
// Render langsung di server backend apapun:
import { renderAurelia, createHtmlDocument, serializeState } from '@aureliajs/ssr';
import { AppRoot } from './components/app-root';

const appHtml = await renderAurelia({
  component: AppRoot,
  props: { title: 'Hello SSR' },
  preserveMarkers: true, // Menyimpan marker <!--au--> untuk hidrasi client
});

const hydrationScript = serializeState('__AURELIA_HYDRATION__', {
  component: 'app-root',
  props: { title: 'Hello SSR' },
});

const documentHtml = createHtmlDocument({
  body: `${appHtml}\n${hydrationScript}`,
  document: { title: 'Aurelia 2 SSR', jsBundle: '/client.js' },
});
```

---

## 🛠️ Menjalankan Contoh

```bash
# 1. Jalankan Unit Test
bun test

# 2. Build Client Bundle
bun run build

# 3. Jalankan Native HTTP Server
bun start
```
