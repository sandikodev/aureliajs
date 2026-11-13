# Clean Example Monorepo Structure

**Goal:** Reference example showing SSR pattern in clean Hono conventions
**Status:** To be created in Phase 4
**Location:** `examples/fullstack-ssr/`

---

## Why Clean Example (Not Migration)

### ✅ Better Approach
- Start fresh, zero baggage
- Show clean architecture
- Make it easy to follow
- Like Hono's official examples
- Easy to fork & extend

### ❌ Avoid
- Migrating existing dashboard (carries legacy complexity)
- Mixing patterns (confusing)
- Hidden gotchas from production code

---

## Example Structure (Single Server Pattern - Like Hono JSX Examples)

```
examples/
└── fullstack-ssr/              ← Single Hono server (not monorepo)
    ├── src/
    │   ├── index.ts            # ← Main entry point (Hono server)
    │   ├── pages/              # ← SSR page routes
    │   │   ├── home.ts         
    │   │   ├── users.ts        
    │   │   ├── settings.ts     
    │   │   └── about.ts        
    │   ├── components/         # ← Aurelia components (shared)
    │   │   ├── Layout.ts/html  
    │   │   ├── UserList.ts/html
    │   │   └── Form.ts/html
    │   ├── api/                # ← API JSON routes
    │   │   ├── users.ts        
    │   │   ├── posts.ts        
    │   │   └── auth.ts         
    │   ├── loaders/            # ← Data loaders
    │   │   ├── users.ts        
    │   │   └── settings.ts
    │   ├── middleware/         # ← Middleware
    │   │   ├── auth.ts
    │   │   └── logger.ts
    │   ├── db/                 # ← Database layer
    │   │   ├── schema.ts
    │   │   └── seed.ts
    │   └── lib/
    │       ├── ssr.ts          # SSR helpers
    │       └── utils.ts
    ├── public/                 # Static assets
    ├── package.json
    ├── tsconfig.json
    ├── wrangler.toml           # Cloudflare Workers (optional)
    └── README.md
```

**Key difference from apps/web + apps/api:**
- ✅ Single Hono server (not separated)
- ✅ Pages + API in same codebase
- ✅ One dev server: `pnpm dev`
- ✅ One deployment target
- ✅ Like Hono's official JSX examples

---

## Pages to Implement

### 1. **Home Page** (Entry point)
**Purpose:** Show basic SSR + hydration

```
GET / → Server renders home.html
  • SSR: Server checks auth, returns HTML
  • Hydration: Client restores state from window.__HYDRATION__
  • Interactive: Button that uses Aurelia binding
```

**File:** `apps/web/src/pages/home-page.ts/html`

---

### 2. **Users Page** (Data loader)
**Purpose:** Show data loading server-side

```
GET /users → Server loads data in loader
  • Loader: Query API for user list
  • SSR: Render with real data
  • Hydration: Client gets pre-loaded data
  • No refetch on first load
```

**File:** `apps/web/src/pages/users-page.ts/html`

---

### 3. **Settings Page** (Protected)
**Purpose:** Show auth guards

```
GET /settings → Server checks auth
  • Auth guard: Only authenticated users
  • SSR: Load user preferences
  • Hydration: Include auth context
  • Redirect if not authenticated
```

**File:** `apps/web/src/pages/settings-page.ts/html`

---

### 4. **About Page** (Static)
**Purpose:** Show simple static rendering

```
GET /about → Static page
  • No loader needed
  • Just HTML + Aurelia bootstrap
  • Minimal hydration
```

**File:** `apps/web/src/pages/about-page.ts/html`

---

## API Routes Structure (Single Server)

### Main Server (`src/index.ts`)

```typescript
import { Hono } from 'hono'
import { renderAurelia, serializeState, createHtmlDocument } from '@hono/aurelia-ssr'
import * as pages from './pages'
import * as apiRoutes from './api'
import * as loaders from './loaders'

const app = new Hono()

// ============= SSR PAGES =============

app.get('/', async (c) => {
  const html = await renderAurelia({
    component: pages.HomePage,
    context: { user: null }
  })
  
  const payload = await serializeState({ user: null })
  return c.html(createHtmlDocument(html, payload))
})

app.get('/users', async (c) => {
  const users = await loaders.usersLoader()
  
  const html = await renderAurelia({
    component: pages.UsersPage,
    props: { data: { users } }
  })
  
  const payload = await serializeState({ user: null }, { users })
  return c.html(createHtmlDocument(html, payload))
})

app.get('/settings', async (c) => {
  const auth = await getAuth(c)
  if (!auth) return c.redirect('/login')
  
  const settings = await loaders.settingsLoader(auth.userId)
  
  const html = await renderAurelia({
    component: pages.SettingsPage,
    context: { user: auth.user },
    props: { data: { settings } }
  })
  
  const payload = await serializeState({ user: auth.user }, { settings })
  return c.html(createHtmlDocument(html, payload))
})

// ============= JSON API Routes =============

// Mount API route handlers
app.route('/api', apiRoutes.users)
app.route('/api', apiRoutes.posts)
app.route('/api', apiRoutes.auth)

// ============= Health Check =============

app.get('/health', (c) => c.json({ status: 'ok' }))

// ============= Export =============

export default app
```

### Loaders (`src/loaders/users.ts`)

```typescript
import { db } from '../db'

export async function usersLoader() {
  const users = await db.query('SELECT id, name, email FROM users')
  return users
}
```

### API Routes (`src/api/users.ts`)

```typescript
import { Hono } from 'hono'
import { db } from '../db'

const router = new Hono()

router.get('/users', async (c) => {
  const users = await db.query('SELECT * FROM users')
  return c.json({ users })
})

router.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id])
  return c.json(user || null)
})

router.post('/users', async (c) => {
  const body = await c.req.json()
  const user = await db.create('users', body)
  return c.json(user)
})

export default router
```

---

## Client-Side Code (Aurelia Components)

### Pages (`src/pages/users.ts`)

```typescript
import { customElement, bindable } from 'aurelia'
import template from './users.html'

interface User {
  id: number
  name: string
  email: string
}

interface UsersPageProps {
  data: { users: User[] }
}

@customElement({
  name: 'users-page',
  template,
})
export class UsersPage {
  @bindable data?: UsersPageProps

  constructor() {
    // Hydration: Client receives data from window.__HYDRATION__
    // No need to fetch /api/users again - data is already here
  }

  deleteUser(userId: number) {
    // Actual API call only for mutations
    fetch(`/api/users/${userId}`, { method: 'DELETE' })
      .then(() => {
        // Update local state
        this.data!.users = this.data!.users.filter(u => u.id !== userId)
      })
  }
}
```

### Template (`src/components/UserList.ts/html`)

```html
<template>
  <div class="container">
    <h1>Users</h1>
    <ul class="user-list">
      <li repeat.for="user of data.users" key.bind="user.id">
        <span>${user.name}</span>
        <span class="email">${user.email}</span>
        <button click.delegate="deleteUser(user.id)">Delete</button>
      </li>
    </ul>
  </div>
</template>
```

### Layout (`src/components/Layout.ts/html`)

```typescript
import { customElement, bindable } from 'aurelia'
import template from './layout.html'

@customElement({
  name: 'app-layout',
  template,
})
export class AppLayout {
  @bindable heading = 'SSR Example'
}
```

```html
<template>
  <header>
    <h1>${heading}</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/users">Users</a>
      <a href="/settings">Settings</a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <slot></slot>
  </main>
</template>
```

---

## How to Run Example (Single Server)

```bash
# Install dependencies
pnpm install

# Development (one dev server only)
pnpm dev
# Runs Hono server on http://localhost:8787

# Build for production
pnpm build

# See pages working
# - http://localhost:8787/       (SSR home)
# - http://localhost:8787/users  (SSR + loader)
# - http://localhost:8787/settings (SSR + auth)
# - http://localhost:8787/about  (SSR static)

# API endpoints available
# - GET /api/users
# - POST /api/users
# - GET /api/users/:id
# - DELETE /api/users/:id
```

**Key difference:**
- ✅ One command: `pnpm dev` (not two dev servers)
- ✅ One port: localhost:8787
- ✅ One Hono server serving everything
- ✅ Like Hono's official examples

---

## Success Criteria

- [ ] Example builds & runs successfully
- [ ] All 4 pages render via SSR
- [ ] All pages hydrate without flicker
- [ ] Data loader works (users page has real data)
- [ ] Auth guard works (settings requires login)
- [ ] No duplicate API calls on hydration
- [ ] Structure is clean & easy to follow
- [ ] Developers understand pattern from example
- [ ] Can be forked & extended easily

---

## How This Differs from Existing apps/

```
Existing apps/{web, api}
├─ Real production SaaS
├─ Complex features (billing, teams, etc.)
├─ Monorepo with separate concerns
└─ Multiple developers with clear ownership

Example fullstack-ssr/
├─ Minimal reference
├─ Single Hono server
├─ Pages + API together
└─ Easy to understand & extend
```

**Both serve different purposes:**
- `apps/{web,api}` = Production reference (real patterns)
- `examples/fullstack-ssr/` = Learning reference (clean pattern)

---

## Why This Works for Maintainers

When you show this to Hono + Aurelia:

✅ **Clean code** — No production baggage
✅ **Clear pattern** — Easy to understand
✅ **Minimal dependencies** — Just what's needed
✅ **Self-contained** — Developers can fork it
✅ **Like official examples** — Familiar structure
✅ **Easy to contribute** — People know where to look

This is how you get adoption. Not by forcing complexity, but by showing simplicity.
