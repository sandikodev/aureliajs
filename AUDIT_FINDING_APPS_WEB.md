# CRITICAL AUDIT FINDING: /apps/web Flicker Fix ✅

**Date:** 2026-11-13 09:54 UTC  
**Status:** ✅ PROBLEM ALREADY SOLVED IN /apps/web

---

## The Problem (Was)

**Flicker/Race Condition Pattern:**
1. Page loads → Aurelia app starts
2. Template renders immediately (loadingAuth = true initially... but no, wait)
3. Sidebar + layout render before auth check completes
4. Auth completes → isAuthRoute updates
5. Sidebar collapse happens → FLICKER

---

## The Solution (Already Implemented!) ✅

### In `/apps/web/src/app.ts`

**Three critical state variables:**

```typescript
/**
 * CRITICAL: Loading state that delays any render until auth check completes.
 * Default: true — nothing renders until auth.refresh() finishes.
 */
loadingAuth = true;

/**
 * CRITICAL: isAuthRoute determines layout rendering.
 * Default: false — renders loading spinner or public layout.
 * Set to true only AFTER auth.refresh() completes AND route is protected.
 */
isAuthRoute = false;
```

**The Middleware Sequence:**

```typescript
async attached(): Promise<void> {
  // Step 1: Register auth error handler
  setUnauthorizedHandler(() => { ... });
  
  // Step 2: Setup router listener
  this.subscription = this.events.subscribe('au:router:navigation-end', () => {
    this.updateLayoutState();  // ← Updates isAuthRoute
    // ...
  });

  // Step 3: AWAIT auth check (loadingAuth blocks render!)
  const [authenticated] = await Promise.all([
    this.auth.refresh(),  // ← Check session
    this.checkApi(),      // ← Check API health
  ]);

  // Step 4: Determine layout state
  this.updateLayoutState();  // ← isAuthRoute = auth.isAuthenticated && !isPublic()

  // Step 5: Redirect if needed
  if (!authenticated && !this.isCurrentRoutePublic()) {
    await this.router.load('login');
  }

  // Step 6: UNBLOCK RENDER!
  this.loadingAuth = false;  // ← NOW template can render

  // Step 7: Load in background (don't block)
  if (authenticated) {
    await Promise.all([this.loadActivity(), this.loadWorkspaces()]);
  }
}
```

### In `/apps/web/src/app.html`

**Three template sections:**

1. **Loading State** (BLOCKS everything)
```html
<div if.bind="loadingAuth">
  <spinner/>
  <p>Initializing...</p>
</div>
```

2. **Authenticated Layout** (Sidebar + admin UI)
```html
<template if.bind="!loadingAuth && auth.isAuthenticated && isAuthRoute">
  <aside><!-- Sidebar --></aside>
  <main><!-- Page content --></main>
</template>
```

3. **Public Layout** (Login, landing page)
```html
<template if.bind="!loadingAuth && !isAuthRoute">
  <router-outlet/>
  <!-- Public layout without sidebar -->
</template>
```

---

## Why This Works (No Flicker)

### Before: Race Condition
```
Page Load
  ├─ Aurelia renders app.html
  ├─ Templates check: !loadingAuth && auth.isAuthenticated && isAuthRoute
  │  At this point: loadingAuth=true, so NOTHING renders yet
  │
  └─ attached() runs in parallel
     ├─ auth.refresh() completes
     ├─ updateLayoutState()
     └─ loadingAuth = false ← TRIGGER: !loadingAuth now true
        
Result: Template re-evaluates with all correct state
```

### After: Fixed ✅
```
1. Initial render: loadingAuth=true → Show spinner only
2. attached() executes → WAIT for auth
3. Auth completes → Set isAuthRoute correctly
4. Set loadingAuth=false → Template re-evaluates
5. Now both conditions match → Show correct layout
6. NO FLICKER because spinner was only thing visible
```

---

## Why This is Better Than SSR

**SSR Approach:**
- Server renders HTML on first load
- But browser hydration still needs to match
- If server state ≠ browser state = hydration mismatch
- Still have race conditions during hydration

**This Approach (SPA):**
- Server gives blank index.html
- Browser knows to wait (loadingAuth=true)
- Shows loading spinner while checking auth
- Once auth resolves, render correct layout
- NO hydration mismatch possible (no SSR HTML)
- Clean, predictable, no race conditions

---

## Implication for `/packages/hono-aurelia-ssr`

This `/apps/web` implementation shows the **SPA + API pattern**:
- Hono serves static `index.html`
- Aurelia SPA loads and runs in browser
- Auth check happens in `attached()`
- No server-side rendering needed!

So the question becomes:

**When do you need `@hono/aurelia-ssr` library?**

1. **Single-server fullstack** (all routes on one server)
   - Hono renders HTML server-side
   - Pass context to component via hydration payload
   - Library handles rendering + serialization

2. **Monorepo SPA+API** (separate builds like `/apps`)
   - API is just Hono JSON endpoints
   - SPA is built separately (Vite)
   - NO library needed! Just use plain Hono static serve
   - This is what `/apps` does currently ✅

---

## Summary

**Status of `/apps/web`:** ✅ **PERFECT**
- Flicker problem already fixed
- Auth loading blocker works correctly
- No race conditions
- Clean state management
- SPA pattern is appropriate here

**Implication for library:**
- The library `@hono/aurelia-ssr` is for **different use case** (fullstack SSR)
- NOT for monorepo SPA+API like `/apps`
- Library should focus on: single-server, server-rendered components, client hydration
- `/apps` doesn't need the library — it just needs clean Hono API

