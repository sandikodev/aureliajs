# Strategic Decision: Library Direction

**Finding:** `/apps/web` sudah solved flickering dengan clean SPA pattern.  
**Question:** Apa yang sebenarnya perlu library `@hono/aurelia-ssr` lakukan?

---

## Two Distinct Use Cases

### Use Case 1: Monorepo (SPA + API) — Like `/apps`

**Current Implementation:**
```
/apps/api → Hono JSON API server
/apps/web → Vite SPA (Aurelia)
Browser  → Loads index.html → Runs Aurelia in browser
```

**Auth Flow:**
- Browser loads blank HTML
- JS runs → attached() fires
- attached() calls /api/auth/me
- Wait for response → Set loadingAuth=false
- Render correct layout

**Library Needed?** ❌ **NO**
- Just need Hono to serve static files
- Don't need server-side rendering
- Already working perfectly with current pattern

**What to build?**
- `@hono/aurelia` package
- Provides clean conventions for SPA+API (not rendering)
- Maybe auth middleware helpers?
- Maybe type-safe API client helpers?

---

### Use Case 2: Single-Server Fullstack SSR

**Pattern:**
```
Single Hono server → Renders HTML server-side
                  → Includes window.__HYDRATION__ payload
                  → Client hydrates components
```

**Example:** Our `/examples/fullstack-ssr`

**Library Needed?** ✅ **YES**
- Need to render Aurelia components on server
- Need to serialize context/props
- Need to inject hydration payload
- Need client hydration helpers

**What exists?**
- `/packages/hono-aurelia-ssr` partially exists
- Has TypeScript errors (we saw them)
- Not fully wired

**What to fix?**
- Fix TypeScript errors in library
- Add comprehensive examples
- Document deployment patterns

---

## Decision Framework

**For `/apps` (monorepo SPA+API):**
- ❌ Don't need `@hono/aurelia-ssr`
- ✅ Need `@hono/aurelia` (lightweight conventions)
- Current SPA pattern is already optimal

**For `/examples/fullstack-ssr`:**
- ✅ Need `@hono/aurelia-ssr` (fullstack SSR)
- Example should showcase library usage
- But library needs to be fixed first

---

## Recommended Action

**Option A: Split into Two Packages**
```
@hono/aurelia       → SPA+API pattern (lightweight)
@hono/aurelia-ssr   → Fullstack SSR pattern (full featured)
```

**Option B: One Package, Multiple Modes**
```
@hono/aurelia
├─ Mode 1: SPA+API (static serve + API helpers)
└─ Mode 2: SSR (rendering + hydration)
```

**My Recommendation: Option A (separate packages)**
- Cleaner separation of concerns
- `/apps` developers don't bloat with SSR code
- `/examples/fullstack-ssr` gets dedicated SSR library
- Each has clear, single responsibility

---

## Next Steps

### Phase 1: Fix SPA+API Pattern (for `/apps`)
Create `@hono/aurelia` package:
- [ ] Clean Hono setup helpers
- [ ] TypeScript API client generator
- [ ] Auth middleware suggestions
- [ ] Documentation

### Phase 2: Fix SSR Pattern (for examples)
Fix `@hono/aurelia-ssr` package:
- [ ] Fix TypeScript errors
- [ ] Complete rendering implementation
- [ ] Add hydration helpers
- [ ] Working examples

### Phase 3: Document Both
- [ ] `/apps` example for SPA+API
- [ ] `/examples/fullstack-ssr` for SSR
- [ ] Decision tree for users

---

## Key Insight

The reason `/apps/web` has NO flicker is because:
1. It uses SPA pattern (not SSR)
2. It has proper loading gate (loadingAuth)
3. No hydration mismatch (no server HTML)

So `/apps` actually **doesn't need library help** — the pattern is already optimal!

The library's job is different: support developers who want **single-server fullstack** pattern instead.

