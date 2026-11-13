# Hono FullStack Conventions: Single vs Monorepo

**Pertanyaan:** Kenapa `web/` dan `api/` harus dipisah di example?

**Jawaban:** Tidak harus! Mari kita lihat konvensi Hono sebenarnya.

---

## Konvensi Hono untuk FullStack

### Pattern 1: Single Repository (JSX Router Pattern)
**Hono resmi gunakan:** Satu repo, satu Hono server

```
hono/examples/jsx-router/
├── src/
│   ├── index.tsx          ← Hono server (semua dalam satu file)
│   ├── routes/
│   │   ├── hello.tsx      ← Halaman
│   │   ├── api.tsx        ← API routes
│   │   └── posts.tsx      ← Halaman dengan data
│   └── components/
│       └── Layout.tsx
├── package.json
└── tsconfig.json
```

**Karakteristik:**
- ✅ **Satu Hono server** (tidak dipisah)
- ✅ **Routing unified** (pages + API dalam satu file)
- ✅ JSX untuk UI
- ✅ Minimal folder structure
- ✅ Deploy sebagai satu app

**Entry point:**
```typescript
// src/index.tsx
const app = new Hono()

// Pages
app.get('/hello', (c) => {
  return c.html(<h1>Hello</h1>)
})

// API
app.get('/api/posts', (c) => {
  return c.json({ posts: [...] })
})

export default app
```

---

### Pattern 2: Monorepo (Separate Concerns)
**Ketika digunakan:** Team besar, domain terpisah

```
monorepo/
├── apps/
│   ├── web/               ← Frontend ONLY
│   │   └── src/app.tsx
│   └── api/               ← Backend ONLY
│       └── src/index.ts
└── packages/
    └── shared/
```

**Karakteristik:**
- ✅ **Team terpisah** (frontend + backend)
- ✅ **Deploy terpisah** (different scalability)
- ✅ **Domain terpisah** (clear ownership)
- ❌ Lebih kompleks
- ❌ Lebih setup

---

## Untuk Example Fullstack SSR: Mana yang Tepat?

### ❌ TIDAK TERBAIK: Memisahkan web/api

```
examples/fullstack-ssr/
├── apps/
│   ├── web/         ← Aurelia SPA
│   └── api/         ← Hono server
└── packages/ssr/
```

**Masalah:**
- Overkill untuk contoh
- Developers harus setup dua dev servers
- Membingungkan "pattern" sebenarnya
- Tidak like Hono's JSX examples

### ✅ LEBIH BAIK: Single Hono server dengan unified routing

```
examples/fullstack-ssr/
├── src/
│   ├── index.ts           ← Main Hono server
│   ├── pages/
│   │   ├── home.ts
│   │   ├── users.ts
│   │   ├── settings.ts
│   │   └── about.ts
│   ├── api/
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── auth.ts
│   ├── components/        ← Aurelia components (shared)
│   │   ├── Layout.ts
│   │   ├── UserList.ts
│   │   └── Forms.ts
│   ├── loaders/
│   │   ├── users.ts
│   │   └── settings.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── lib/
│       └── ssr.ts
├── package.json
└── tsconfig.json
```

**Keuntungan:**
- ✅ **Simple** (satu dev server)
- ✅ **Like Hono examples** (familiar)
- ✅ **Clear pattern** (semua di satu tempat)
- ✅ **Easy to understand** (developers langsung paham)
- ✅ **Easy to deploy** (satu Hono app)

---

## Contoh Code: Single Server Pattern

### `src/index.ts` (Main server)

```typescript
import { Hono } from 'hono'
import { renderAurelia, serializeState, createHtmlDocument } from '@hono/aurelia-ssr'

const app = new Hono()

// ============= PAGES (SSR) =============

app.get('/', async (c) => {
  const html = await renderAurelia({
    component: HomePage,
    context: { user: null }
  })
  
  const payload = await serializeState({ user: null })
  return c.html(createHtmlDocument(html, payload))
})

app.get('/users', async (c) => {
  const users = await getUsersLoader()
  
  const html = await renderAurelia({
    component: UsersPage,
    props: { data: { users } }
  })
  
  const payload = await serializeState({ user: null }, { users })
  return c.html(createHtmlDocument(html, payload))
})

app.get('/settings', async (c) => {
  const auth = await getAuth(c)
  if (!auth) return c.redirect('/login')
  
  const settings = await getSettingsLoader(auth.userId)
  
  const html = await renderAurelia({
    component: SettingsPage,
    context: { user: auth.user },
    props: { data: { settings } }
  })
  
  const payload = await serializeState({ user: auth.user }, { settings })
  return c.html(createHtmlDocument(html, payload))
})

// ============= API Routes =============

app.get('/api/users', async (c) => {
  const users = await db.query('SELECT * FROM users')
  return c.json({ users })
})

app.post('/api/users', async (c) => {
  const body = await c.req.json()
  const user = await db.create('users', body)
  return c.json(user)
})

app.get('/api/settings/:userId', async (c) => {
  const userId = c.req.param('userId')
  const settings = await db.query('SELECT * FROM settings WHERE user_id = ?', [userId])
  return c.json(settings[0])
})

// ============= Export =============

export default app
```

### `src/components/HomePage.ts`

```typescript
import { customElement } from 'aurelia'
import template from './home-page.html'

@customElement({
  name: 'home-page',
  template,
})
export class HomePage {
  greeting = 'Welcome to SSR Example'
}
```

### `src/loaders/users.ts`

```typescript
export async function getUsersLoader() {
  // Bisa fetch dari database langsung
  // atau dari fetch internal API
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]
}
```

### `package.json`

```json
{
  "name": "hono-aurelia-ssr-example",
  "scripts": {
    "dev": "wrangler dev src/index.ts",
    "build": "wrangler build",
    "start": "wrangler deploy"
  },
  "dependencies": {
    "hono": "latest",
    "@hono/aurelia-ssr": "workspace:*",
    "aurelia": "2.0.0-rc.2"
  },
  "devDependencies": {
    "wrangler": "latest",
    "@types/node": "latest",
    "typescript": "latest"
  }
}
```

---

## Folder Structure: Single Server (BERSIH)

```
examples/fullstack-ssr/
├── src/
│   ├── index.ts              ← Entry point (Hono server)
│   ├── pages/
│   │   ├── home.ts
│   │   ├── users.ts
│   │   ├── settings.ts
│   │   └── about.ts
│   ├── components/           ← Shared Aurelia components
│   │   ├── Layout.ts/html
│   │   ├── UserList.ts/html
│   │   └── Form.ts/html
│   ├── api/                  ← API route handlers
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── auth.ts
│   ├── loaders/              ← Data loaders
│   │   ├── users.ts
│   │   ├── settings.ts
│   │   └── posts.ts
│   ├── middleware/           ← Middleware
│   │   ├── auth.ts
│   │   └── logger.ts
│   ├── db/                   ← Database
│   │   ├── schema.ts
│   │   └── seed.ts
│   └── lib/
│       ├── ssr.ts           ← SSR helpers
│       └── utils.ts
├── public/
│   └── (static assets)
├── package.json
├── tsconfig.json
├── wrangler.toml            ← Cloudflare Workers config (optional)
└── README.md
```

---

## Deployment: Single Server

### Cloudflare Workers (Hono native)
```bash
# Development
pnpm dev
# Runs single Hono server on localhost:8787

# Production
pnpm deploy
# Deploys single Hono worker to Cloudflare
```

### Node.js
```bash
# src/index.ts
import { serve } from 'hono/node'
const app = new Hono()
// ... routes ...
serve(app, () => console.log('Server running on :3000'))
```

---

## Perbandingan: Monorepo vs Single Server

| Aspek | Single Server (✅ Recommended) | Monorepo (❌ Overcomplicated) |
|-------|-------|---------|
| Dev setup | Satu `pnpm dev` | Dua dev servers |
| File organization | Satu folder | Dua folders |
| Routing | Unified | Separated |
| Like Hono examples | ✅ Yes | ❌ No |
| Complexity | Low | High |
| Good for demo | ✅ Yes | ❌ No |
| Good for team project | ❌ No | ✅ Yes |

---

## Kesimpulan

**Untuk example fullstack SSR:**

### ❌ JANGAN gunakan apps/web + apps/api
Itu pattern untuk **team besar** dengan **separate deployments**.

### ✅ GUNAKAN single server pattern
```
examples/fullstack-ssr/
└── src/
    ├── pages/       ← SSR pages
    ├── components/  ← Aurelia components
    ├── api/         ← API routes
    └── index.ts     ← Main server
```

**Ini:**
- Match Hono conventions (like JSX examples)
- Simple untuk developers baru
- Easy to understand the pattern
- Easy to extend
- Satu dev server, satu deploy

---

## Files to Update

1. **EXAMPLE_STRUCTURE.md** — Update ke single server pattern
2. **POC_EXECUTION_PLAN.md** — Clarify single server approach

Mari?
