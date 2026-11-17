# Technical Specification: Hono + Aurelia Fullstack SSR

**Status:** Architecture Definition  
**Version:** 1.0  
**Date:** 2026-11-13  
**For:** @hono/aurelia package & integration

---

## 1. System Overview

### 1.1 Current State (SPA + Headless API)

```
Browser                           Hono API Server
─────────────────────────────────────────────────
│ Aurelia SPA                    │ Express Routes
│ • Load app.ts                  │ • GET /api/auth/me
│ • Check session (manual)       │ • POST /api/auth/login
│ • Load page component          │ • GET /api/dashboard
│ • Fetch data (manual)          │ • GET /api/projects
│ • Render                       │
│                                │
Status: LOADED (but auth ?)      └─ Auth middleware
                                    ✓ Checks session
                                    ✓ Returns user data
```

**Problem:** Client auth state is always stale relative to server session.

### 1.2 Desired State (Integrated Fullstack SSR)

```
Browser                           Hono App Server
─────────────────────────────────────────────────
│ GET /dashboard                 │
│                                │ Auth Middleware
│                                ├─ Check session ✓
│                                ├─ Resolve user ✓
│                                │
│                                │ Page Route Handler
│                                ├─ Query auth context
│                                ├─ Load data (async)
│                                ├─ Render to HTML
│                                ├─ Inject state
│                                │
│ ← HTML + Hydration Payload     │
│ Aurelia Hydration              │
│ • Reuse server HTML            │
│ • Restore state                │
│ • Attach handlers              │
│ • Ready for SPA                │
│                                │
Status: INTERACTIVE (auth ✓)     └─ No refetch needed
```

**Solution:** Auth context flows from server → client without manual sync.

---

## 2. Component Architecture

### 2.1 @hono/aurelia Package

```typescript
// Public API Surface
export {
  // Core functions
  renderAurelia,
  renderToString,
  serializeState,
  createHtmlDocument,
  
  // Route adapter
  aurelia,
  
  // Types
  type RenderContext,
  type HydrationPayload,
  type AureliaRouteConfig,
  
  // Utilities
  hydrateFromServer,
};
```

### 2.2 Data Flow Diagram

```
REQUEST
│
├─ [1] Browser GET /dashboard
│      Accept: text/html
│
├─ [2] Hono Router Match
│      Middleware chain
│      ├─ Auth (session cookie)
│      ├─ Tenancy (workspace)
│      └─ Logging
│
├─ [3] Page Handler (using aurelia() adapter)
│      ├─ Check requiresAuth
│      ├─ Call loaders
│      │  ├─ api.dashboard()
│      │  ├─ api.activity()
│      │  └─ api.workspaces()
│      │
│      ├─ renderAurelia({
│      │    component: DashboardPage,
│      │    context: { user, workspace, role },
│      │    props: { /* loader data */ }
│      │  })
│      │
│      └─ createHtmlDocument(
│           htmlString,
│           {
│             component: 'dashboard-page',
│             context: { user, workspace, role },
│             initialData: { dashbaord, activity, workspaces },
│             timestamp: Date.now()
│           }
│         )
│
├─ [4] Response
│      Content-Type: text/html
│      Body: <!DOCTYPE html>
│             <html>
│              ...
│              <script>
│                window.__HYDRATION__ = { ... }
│              </script>
│             </html>
│
├─ [5] Browser Receives HTML
│      ├─ Parse HTML
│      ├─ Read window.__HYDRATION__
│      ├─ Restore auth context
│      ├─ Restore initial data
│      └─ Attach event handlers
│
└─ [6] SPA Mode Starts
       Ready for client-side navigation
```

---

## 3. Core Functions

### 3.1 renderAurelia()

**Purpose:** Render Aurelia component to HTML string on server

**Signature:**
```typescript
export async function renderAurelia(
  options: RenderOptions
): Promise<string>

interface RenderOptions {
  component: any;              // Aurelia component class
  context?: RenderContext;     // Auth/workspace/role
  props?: Record<string, any>; // Component props
  timeout?: number;            // Max render time (default 5000ms)
}

interface RenderContext {
  user: User | null;
  workspace: Workspace | null;
  role: Role | null;
}
```

**Algorithm:**
1. Create Aurelia instance (isolated, no DI pollution)
2. Register component and dependencies
3. Inject context into container
4. Instantiate component
5. Call lifecycle: `attached()`
6. Render template to HTML string
7. Clean up resources
8. Return HTML

**Error Handling:**
- Timeout: Render partial or fallback
- Missing template: Throw with component name
- Lifecycle error: Catch, log, but continue
- Serialize error: Fallback to empty payload

**Performance Targets:**
- Simple component: < 10ms
- Complex component (dashboard): < 100ms
- With API calls: < 500ms

### 3.2 serializeState()

**Purpose:** Serialize auth context + initial data to JSON

**Signature:**
```typescript
export async function serializeState(
  context: RenderContext,
  initialData?: Record<string, any>,
  componentName?: string
): Promise<HydrationPayload>

interface HydrationPayload {
  component: string;
  context: {
    user: User | null;
    workspace: Workspace | null;
    role: Role | null;
    isAuthenticated: boolean;
  };
  initialData?: Record<string, any>;
  timestamp: number;
}
```

**Algorithm:**
1. Validate context
2. Clean sensitive fields (passwords, tokens)
3. Serialize to JSON
4. Add timestamp (deterministic)
5. Return payload

**Serialization Rules:**
- Never include: `password`, `refreshToken`, `apiKey`
- Always include: `id`, `email`, `name`, `role`
- Circular references: Replaced with `[Circular]`
- Undefined: Omitted from JSON
- Dates: Converted to ISO 8601

### 3.3 createHtmlDocument()

**Purpose:** Build complete HTML document with hydration payload

**Signature:**
```typescript
export function createHtmlDocument(
  bodyContent: string,
  payload: HydrationPayload,
  options?: DocumentOptions
): string

interface DocumentOptions {
  title?: string;
  lang?: string;
  basePath?: string;  // default '/'
  cssBundle?: string; // default '/assets/main.css'
  jsBundle?: string;  // default '/src/main.ts'
}
```

**HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en" class="h-full">
  <head>
    <!-- Required meta -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    
    <!-- Router base -->
    <base href="/" />
    
    <!-- Styles -->
    <link rel="stylesheet" href="/assets/main.css" />
    
    <!-- Hydration payload (before main.ts) -->
    <script>
      window.__HYDRATION__ = {JSON.stringify(payload)};
      window.__HYDRATION_TIME__ = ${payload.timestamp};
    </script>
  </head>
  <body class="h-full">
    <app-root>{bodyContent}</app-root>
    
    <!-- Main app (triggers hydration) -->
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Security:**
- XSS prevention: JSON.stringify() escapes special chars
- Content-Type: text/html charset=utf-8
- CSP headers: (managed by Hono middleware)

### 3.4 aurelia() Route Adapter

**Purpose:** Single handler for HTML SSR + JSON API

**Signature:**
```typescript
export function aurelia(
  config: AureliaRouteConfig
): (c: Context) => Promise<Response>

interface AureliaRouteConfig {
  component: any;
  title: string;
  requiresAuth?: boolean;      // default false
  loaders?: {
    [key: string]: (c: Context) => Promise<any>;
  };
  fallback?: 'spa' | 'error';  // default 'spa'
}
```

**Handler Algorithm:**
```
1. Extract context from c.get('auth')
   user, workspace, role

2. Check auth guard
   if (requiresAuth && !user)
     return c.redirect('/login', 302)

3. Content negotiation (Accept header)
   if 'text/html':
     → SSR path (continue to 4)
   elif 'application/json':
     → JSON path (go to 8)
   else:
     → 406 Not Acceptable

4. Load initial data
   for each loader in config.loaders:
     initialData[key] = await loader(c)

5. Render component
   html = await renderAurelia({
     component: config.component,
     context: { user, workspace, role },
   })

6. Serialize state
   payload = await serializeState(
     { user, workspace, role },
     initialData,
     config.component.name
   )

7. Create HTML document
   document = createHtmlDocument(
     html,
     payload,
     { title: config.title }
   )
   return c.html(document)

8. Return JSON
   return c.json(initialData)

9. On error
   if config.fallback === 'spa':
     return empty shell (hydrate on client)
   elif config.fallback === 'error':
     return c.json({ error: ... }, 500)
```

**Error Paths:**
- Loader throws: Return 500 + error message
- Render throws: Return 500 + fallback to SPA
- Serialize throws: Return 500 + fallback to SPA

---

## 4. Client-Side Integration

### 4.1 hydrateFromServer()

**Purpose:** Restore server state in client, prevent refetch

**Signature:**
```typescript
export async function hydrateFromServer(
  options?: HydrationOptions
): Promise<HydrationPayload | null>

interface HydrationOptions {
  autoRestoreAuth?: boolean;  // default true
  autoCacheData?: boolean;    // default true
  debug?: boolean;            // default false
}
```

**Algorithm:**
1. Check for `window.__HYDRATION__`
   if not found: return null (SPA mode)

2. Validate payload
   - Check timestamp (not too old)
   - Verify component name matches current page

3. If `autoRestoreAuth`:
   - Get AuthService
   - Call auth.apply(payload.context)
   - Set auth.ready = true

4. If `autoCacheData`:
   - Store initialData in sessionStorage
   - Use key: `__HYDRATION_DATA_{componentName}`

5. Clean up
   - Delete window.__HYDRATION__
   - Delete window.__HYDRATION_TIME__

6. Return payload (for debugging)

**Integration in main.ts:**
```typescript
// main.ts
void Aurelia.register(...)
  .app(...)
  .start()
  .then(async () => {
    const hydration = await hydrateFromServer();
    if (hydration) {
      console.log('✓ Hydrated from server');
      if (import.meta.env.DEV) {
        console.log('  Component:', hydration.component);
        console.log('  Auth:', hydration.context.isAuthenticated);
      }
    } else {
      console.log('  Running in SPA mode (no server hydration)');
    }
  });
```

### 4.2 Data Caching Pattern

**Goal:** Prevent API refetch after hydration

**Pattern:**
```typescript
// In page component (e.g., dashboard-page.ts)
private getCachedData<T>(key: string): T | null {
  const cached = sessionStorage.getItem(`__HYDRATION_DATA_${key}`);
  if (cached) {
    sessionStorage.removeItem(`__HYDRATION_DATA_${key}`);
    return JSON.parse(cached);
  }
  return null;
}

async attached(): Promise<void> {
  // Try hydration cache first
  this.overview = this.getCachedData('overview');
  
  // If not hydrated (SPA mode or cache expired), fetch
  if (!this.overview) {
    this.overview = await api.overview('last-7');
  }
}
```

---

## 5. Integration in Existing Project

### 5.1 Current Project Structure

```
apps/web/
├── src/
│   ├── pages/
│   │   ├── dashboard-page.ts
│   │   ├── projects-page.ts
│   │   └── ...
│   ├── app.ts
│   └── main.ts

apps/api/
├── src/
│   ├── index.ts (Hono app)
│   ├── routes/
│   │   ├── api.ts (JSON routes)
│   │   └── ...
│   └── ...
```

### 5.2 SSR-Integrated Structure

```
apps/web/
├── src/
│   ├── pages/
│   │   ├── dashboard-page.ts     (No change needed)
│   │   ├── projects-page.ts      (No change needed)
│   │   └── ...
│   ├── hydration.ts             (NEW)
│   ├── app.ts
│   └── main.ts                  (Add hydration call)

apps/api/
├── src/
│   ├── index.ts                 (Hono app)
│   ├── routes/
│   │   ├── api.ts               (JSON API routes)
│   │   ├── pages.ts             (NEW - SSR routes)
│   │   └── middleware.ts        (Auth middleware)
│   └── ...
```

### 5.3 API Routes File (pages.ts)

**Current (before):**
```typescript
// routes/api.ts
app.get('/api/dashboard', dashboardHandler);  // JSON only
app.get('/api/projects', projectsHandler);   // JSON only
```

**After:**
```typescript
// routes/pages.ts (NEW)
import { aurelia } from '@hono/aurelia';
import { DashboardPage } from '@web/pages/dashboard-page';
import { ProjectsPage } from '@web/pages/projects-page';

export function registerPageRoutes(app: HonoApp) {
  // Dashboard — SSR + JSON
  app.get('/dashboard', aurelia({
    component: DashboardPage,
    title: 'Dashboard',
    requiresAuth: true,
    loaders: {
      overview: async (c) => {
        const { workspace } = c.get('auth');
        return api.overview('last-7', workspace.id);
      },
      activity: async (c) => {
        const { workspace } = c.get('auth');
        return api.activity(workspace.id);
      },
    },
  }));
  
  // Projects — SSR + JSON
  app.get('/projects', aurelia({
    component: ProjectsPage,
    title: 'Projects',
    requiresAuth: true,
    loaders: {
      projects: async (c) => {
        const { workspace } = c.get('auth');
        const { q, status, page } = c.req.query();
        return api.projects(workspace.id, {
          q: q as string,
          status: status as string,
          page: parseInt(page as string) || 1,
        });
      },
    },
  }));
}
```

---

## 6. Request/Response Examples

### 6.1 HTML Request (Browser)

**Request:**
```
GET /dashboard HTTP/1.1
Host: localhost:4600
Accept: text/html,application/xhtml+xml
Accept-Language: en-US
Cookie: session=eyJhbGci...
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 8432
Set-Cookie: session=eyJhbGci...; HttpOnly; Path=/

<!DOCTYPE html>
<html lang="en" class="h-full">
  <head>
    ...
    <script>
      window.__HYDRATION__ = {
        "component": "dashboard-page",
        "context": {
          "user": {"id": "user_123", "name": "Jane Doe", ...},
          "workspace": {"id": "ws_456", "name": "Northwind", ...},
          "role": "owner",
          "isAuthenticated": true
        },
        "initialData": {
          "overview": {
            "stats": {"total": 1234, ...},
            "trend": [{...}, ...]
          },
          "activity": [{...}, ...]
        },
        "timestamp": 1699872000000
      };
    </script>
  </head>
  <body class="h-full">
    <app-root>
      <dashboard-page>
        <!-- Rendered server HTML here -->
      </dashboard-page>
    </app-root>
  </body>
</html>
```

### 6.2 JSON Request (SPA Fallback)

**Request:**
```
GET /dashboard HTTP/1.1
Host: localhost:4600
Accept: application/json
Cookie: session=eyJhbGci...
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "overview": {
    "stats": {"total": 1234, ...},
    "trend": [{...}, ...]
  },
  "activity": [{...}, ...]
}
```

### 6.3 Unauthorized (No Auth)

**Request:**
```
GET /dashboard HTTP/1.1
Host: localhost:4600
Cookie: (no session)
```

**Response:**
```
HTTP/1.1 302 Found
Location: /login
```

---

## 7. Hydration Mismatch Prevention

### 7.1 Deterministic Rendering

**Rules:**
1. No `Math.random()` in templates
2. No `Date.now()` or `new Date()` in initial render
3. Use frozen timestamp from hydration payload
4. Use stable sort (not Array.sort which is unstable)

**Example:**
```typescript
// ❌ BAD - Will mismatch
export class Dashboard {
  requestId = Math.random().toString(36);  // Different on server/client
  
  get currentTime() {
    return new Date().toLocaleString();    // Different on server/client
  }
}

// ✅ GOOD - Will match
export class Dashboard {
  private readonly createdAt = 0;  // Set in constructor
  
  get hydrationTimestamp() {
    return (window as any).__HYDRATION_TIME__ ?? Date.now();  // Use server time
  }
}
```

### 7.2 Server/Client Equality Testing

**Test pattern:**
```typescript
test('dashboard renders consistently', async () => {
  const context = {
    user: { id: '123', name: 'Test', ... },
    workspace: { id: 'ws_1', name: 'Test Workspace', ... },
    role: 'owner',
  };
  
  // Render on "server"
  const serverHtml = await renderAurelia({
    component: DashboardPage,
    context,
    props: { data: mockData },
  });
  
  // Parse and snapshot
  const serverDOM = parse(serverHtml);
  
  // Verify key elements
  expect(serverDOM).toContain('Northwind Studio');
  expect(serverDOM).toContain('1,234');
  
  // Verify no random/timestamp-based content
  expect(serverDOM).not.toContain('Date.now()');
  expect(serverDOM).not.toContain('Math.random()');
});
```

---

## 8. Performance Characteristics

### 8.1 Load Time Comparison

**Scenario:** Cold load, dashboard with 1000 projects

| Metric | SPA Only | SPA + SSR |
|--------|----------|-----------|
| DNS + TCP | 50ms | 50ms |
| Server render | — | 100ms |
| Transfer HTML | 20ms | 30ms |
| Client parse HTML | 50ms | 50ms |
| API call (overview) | 100ms | — |
| API call (activity) | 100ms | — |
| Client hydrate | 50ms | 50ms |
| **Total to interactive** | **370ms** | **280ms** |
| **Improvement** | — | **24%** |

### 8.2 Render Time Targets

| Component | Target | Reason |
|-----------|--------|--------|
| Simple page | < 10ms | Minimal HTML |
| Complex dashboard | < 100ms | With loop rendering |
| Large table (1000 rows) | < 200ms | DOM heavy |
| Timeout | 5000ms | Fallback to SPA |

### 8.3 Bundle Size Impact

**@hono/aurelia package:**
- Minified: ~15 KB
- Gzipped: ~5 KB
- Runtime overhead: < 100ms

---

## 9. Error Handling Strategy

### 9.1 Error Categories

| Error | Cause | Handling |
|-------|-------|----------|
| Render timeout | Component slow to attach | Fallback to SPA |
| Loader error | API call fails | 500 + error page |
| Serialize error | Circular reference | Use fallback payload |
| Hydration mismatch | Determinism fail | Log warning, continue |
| Missing component | Component not found | 500 error |

### 9.2 Fallback Strategy

```typescript
// Fallback 1: Empty shell (SPA takes over)
const fallbackHtml = `<app-root></app-root>`;
const fallbackPayload = {
  component: 'unknown',
  context: { isAuthenticated: false },
  initialData: null,
  timestamp: Date.now(),
};
return c.html(
  createHtmlDocument(fallbackHtml, fallbackPayload, { title: 'Loading' })
);

// Fallback 2: Error page
return c.html(`
  <html>
    <body>
      <h1>500 Error</h1>
      <p>The page failed to load. Please try again.</p>
      <a href="/">Go home</a>
    </body>
  </html>
`, 500);
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
describe('@hono/aurelia', () => {
  describe('renderAurelia()', () => {
    it('renders simple component', async () => { ... });
    it('calls attached() lifecycle', async () => { ... });
    it('injects context', async () => { ... });
    it('times out after 5s', async () => { ... });
  });
  
  describe('serializeState()', () => {
    it('serializes auth context', async () => { ... });
    it('excludes sensitive fields', async () => { ... });
    it('handles circular references', async () => { ... });
  });
  
  describe('createHtmlDocument()', () => {
    it('creates valid HTML', () => { ... });
    it('injects hydration payload', () => { ... });
    it('escapes XSS payloads', () => { ... });
  });
  
  describe('aurelia()', () => {
    it('guards unauthorized access', async () => { ... });
    it('negotiates HTML content', async () => { ... });
    it('negotiates JSON content', async () => { ... });
    it('calls loaders', async () => { ... });
  });
});
```

### 10.2 Integration Tests

```typescript
describe('Hono + Aurelia integration', () => {
  it('SSR dashboard with data', async () => {
    const res = await app.request('/dashboard');
    expect(res.status).toBe(200);
    expect(res.text()).toContain('dashboard-page');
    expect(res.text()).toContain('window.__HYDRATION__');
  });
  
  it('hydrates on client without refetch', async () => {
    // Render on server
    const serverHtml = ...;
    
    // Verify no additional API calls needed
    // (auth + data already in payload)
  });
  
  it('falls back to SPA on error', async () => {
    // Simulate render error
    // Expect fallback empty shell
  });
});
```

---

## 11. Migration Path (Existing Project)

### Phase 1: No-op
- Deploy @hono/aurelia (unused)
- All routes still SPA

### Phase 2: Opt-in
- Migrate high-traffic routes (dashboard, projects)
- A/B test performance
- Verify no issues

### Phase 3: Gradual Rollout
- Migrate remaining protected routes
- Keep public routes as SPA (login, landing)
- Monitor error rates

### Phase 4: Full SSR
- All protected routes SSR
- Public routes SPA
- Performance stable

---

## 12. Success Criteria

### Must Have
- [ ] renderAurelia() works
- [ ] Hydration works
- [ ] No hydration mismatches
- [ ] Auth context flows correctly
- [ ] No API refetch on first load
- [ ] Performance improved 20%+ 

### Should Have
- [ ] TypeScript strict mode
- [ ] 80%+ test coverage
- [ ] Error boundaries
- [ ] Streaming HTML (future)

### Nice to Have
- [ ] Performance monitoring
- [ ] Automatic fallback on slow renders
- [ ] Cache invalidation strategy
- [ ] Open-source contribution

---

**Document Status:** Ready for implementation  
**Last Updated:** 2026-11-13  
**Next Review:** When Phase 1 complete
