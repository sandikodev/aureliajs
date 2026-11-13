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

## Example Structure (Like Hono JSX Examples)

```
examples/
└── fullstack-ssr/
    ├── package.json              # Monorepo root
    ├── pnpm-workspace.yaml
    ├── README.md                 # Setup instructions
    ├── docs/
    │   ├── ARCHITECTURE.md       # How pattern works
    │   ├── GETTING_STARTED.md    # Step-by-step
    │   └── TROUBLESHOOTING.md    # Common issues
    ├── apps/
    │   ├── web/                  # Aurelia SPA + SSR
    │   │   ├── src/
    │   │   │   ├── pages/
    │   │   │   │   ├── home-page.ts/html
    │   │   │   │   ├── users-page.ts/html
    │   │   │   │   ├── settings-page.ts/html
    │   │   │   │   └── about-page.ts/html
    │   │   │   ├── services/
    │   │   │   │   ├── auth.ts
    │   │   │   │   └── api.ts
    │   │   │   ├── app.ts
    │   │   │   ├── app.html
    │   │   │   └── main.ts
    │   │   ├── package.json
    │   │   └── vite.config.ts
    │   └── api/                  # Hono API + SSR
    │       ├── src/
    │       │   ├── index.ts      # Main Hono server
    │       │   ├── routes/
    │       │   │   ├── pages.ts  # SSR routes
    │       │   │   ├── api.ts    # JSON API
    │       │   │   └── health.ts
    │       │   ├── loaders/
    │       │   │   ├── users.ts
    │       │   │   └── settings.ts
    │       │   ├── middleware/
    │       │   │   └── auth.ts
    │       │   └── lib/
    │       │       └── ssr.ts    # SSR rendering logic
    │       ├── package.json
    │       └── wrangler.toml     # Cloudflare Workers
    └── packages/
        └── shared/               # Shared types & constants
            ├── src/
            │   ├── types.ts
            │   └── constants.ts
            └── package.json
```

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

## API Routes Structure

### SSR Routes (`apps/api/src/routes/pages.ts`)

```typescript
// Pattern: One route that handles all SSR pages
app.get('/pages/*', async (c) => {
  const page = c.req.param('*')  // e.g., 'users', 'settings'
  
  // 1. Auth check (if protected)
  const auth = await getAuth(c)
  if (!auth && isProtected(page)) {
    return c.redirect('/login')
  }
  
  // 2. Load data via loader
  const loader = getLoader(page)
  const data = await loader(auth)
  
  // 3. Render page component
  const component = getComponent(page)
  const html = await renderAurelia({
    component,
    context: { user: auth?.user },
    props: { data }
  })
  
  // 4. Serialize state for hydration
  const payload = await serializeState(
    { user: auth?.user },
    data,
    page
  )
  
  // 5. Create final HTML document
  return c.html(
    createHtmlDocument(html, payload)
  )
})
```

### Data Loaders (`apps/api/src/loaders/`)

```typescript
// users.ts
export async function usersLoader(auth?: AuthContext) {
  const res = await fetch('http://localhost:4601/api/users', {
    headers: auth ? { Authorization: `Bearer ${auth.token}` } : {}
  })
  return res.json()
}

// settings.ts
export async function settingsLoader(auth: AuthContext) {
  if (!auth) throw new Error('Unauthorized')
  const res = await fetch(`http://localhost:4601/api/users/${auth.user.id}/settings`)
  return res.json()
}
```

---

## Client-Side Code

### Pages (`apps/web/src/pages/users-page.ts`)

```typescript
import { customElement, bindable } from 'aurelia'
import template from './users-page.html'

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
    // No need to fetch again
  }
}
```

### Template (`apps/web/src/pages/users-page.html`)

```html
<template>
  <div class="container">
    <h1>Users</h1>
    <ul>
      <li repeat.for="user of data.users">
        ${user.name} (${user.email})
      </li>
    </ul>
  </div>
</template>
```

---

## How to Run Example

```bash
# Install
pnpm install

# Development
pnpm dev
# Starts:
#   - web dev server (Vite) on :4600
#   - api server (Hono) on :4601

# Build
pnpm build

# See pages working
# - http://localhost:4601/ (SSR home)
# - http://localhost:4601/users (SSR + loader)
# - http://localhost:4601/settings (SSR + auth)
# - http://localhost:4601/about (SSR static)
```

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
├─ Lots of domain-specific logic
└─ Hard to extract pattern

Example fullstack-ssr/
├─ Minimal reference
├─ Shows pattern only
├─ Easy to understand
└─ Easy to customize
```

**Both can coexist:**
- Keep `apps/{web,api}` as-is (production)
- Add `examples/fullstack-ssr/` as pattern (learning)

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
