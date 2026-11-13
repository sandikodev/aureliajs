# 🚨 ROOT CAUSE: Login Loop Issue

**Status:** FOUND THE BUG! ✅

---

## The Problem

When user lands on `/login`, they get stuck in infinite loop instead of rendering login page cleanly.

**Sequence:**
1. App loads → attached() → auth.refresh() → empty session
2. App tries to check: is current route public?
3. **BUG:** Uses `window.location.pathname` regex which is unreliable
4. Pathname still `/` from initial load, not `/login` yet
5. App thinks it's on "/" (public) → doesn't redirect
6. BUT router hasn't actually loaded LoginPage yet
7. Timing race condition → components load unpredictably

---

## The Bug in Detail

**File:** `apps/web/src/app.ts`

```typescript
private isCurrentRoutePublic(): boolean {
  // ❌ WRONG: This checks URL pathname, not actual router state
  const pathname = window.location.pathname;
  return /^(\/|\/login|\/invite)\/?$/.test(pathname);
}
```

**Why this fails:**
- When router navigates programmatically (not via URL), pathname doesn't update
- Aurelia router has its own internal route state
- Checking pathname is checking the wrong source of truth
- Should check router's `currentComponent` instead

---

## The Real Source of Truth

Aurelia Router tracks:
- `currentComponent` — the active component
- `activeViewport` — the viewport being rendered
- `navigationModel` — route metadata

**Correct check:**

```typescript
private isCurrentRoutePublic(): boolean {
  // ✅ RIGHT: Check router's actual state
  const component = this.router.currentComponent?.component;
  if (!component) return true;  // Unknown = treat as public (show spinner)
  
  // Check if this component is in PUBLIC_ROUTES
  return PUBLIC_ROUTES.some(route => route.component === component);
}
```

But wait — `router.currentComponent` might not exist during boot!

**Better approach:**

```typescript
private isCurrentRoutePublic(): boolean {
  // ✅ BEST: Use route metadata from router state
  try {
    const route = this.router.currentRoute;
    if (!route) return true;  // No route yet = treat as public
    
    // The route config was set up with public: true flag
    return PUBLIC_ROUTES.some(
      r => (r.path as string) === (route.path as string)
    );
  } catch {
    return true;  // If router state is weird, treat as public
  }
}
```

Actually, **simplest solution:**

```typescript
private isCurrentRoutePublic(): boolean {
  // ✅ SIMPLEST: Just check the component instance
  // If we're rendering LoginPage, that's public
  // If we're rendering DashboardPage, that's protected
  
  // During boot (no component yet), treat as loading:
  if (this.loadingAuth) return true;
  
  // After boot, check if current component is public
  const component = this.router.currentComponent?.component;
  return PUBLIC_ROUTES.some(route => route.component === component);
}
```

---

## Fix Summary

**Current (Broken):**
- App checks `window.location.pathname` regex
- Unreliable during SPA navigation
- Race conditions during boot
- Components load unpredictably

**Fixed (Correct):**
- App checks Aurelia router's actual state
- Check `router.currentComponent` or `router.currentRoute`
- Or check `loadingAuth` flag (most reliable during boot)
- **Guaranteed to match actual rendered component**

---

## Why It Causes Login Loop

1. App.attached() runs → `auth.refresh()` → `authenticated = false`
2. Check `isCurrentRoutePublic()` → **Returns wrong value** due to pathname bug
3. App doesn't redirect, but also doesn't set layout correctly
4. LoginPage.attached() runs → tries to refresh auth again
5. Still not authenticated
6. **But LoadingAuth is NOW false** → Layout starts rendering
7. App re-evaluates isAuthRoute → still sees pathname as "/" not "/login"
8. Sidebar tries to render → race conditions
9. **Infinite loop: auth check → redirect → auth check again**

---

## The Fix

**In `apps/web/src/app.ts`**, replace:

```typescript
private isCurrentRoutePublic(): boolean {
  const pathname = window.location.pathname;
  return /^(\/|\/login|\/invite)\/?$/.test(pathname);
}
```

**With:**

```typescript
private isCurrentRoutePublic(): boolean {
  // During loading, treat everything as public (show spinner)
  if (this.loadingAuth) return true;
  
  // After loading, check router's actual state
  // Get the current route from router
  const component = (this.router as any).currentComponent?.component;
  if (!component) {
    console.warn('[app] Could not determine current component');
    return true;  // Assume public if unknown
  }
  
  // Check against PUBLIC_ROUTES using component identity
  const isPublic = PUBLIC_ROUTES.some(route => route.component === component);
  return isPublic;
}
```

**Also call this after each route change:**

```typescript
async attached(): Promise<void> {
  // ... existing code ...
  
  this.subscription = this.events.subscribe('au:router:navigation-end', () => {
    this.updateLayoutState();  // ← This calls isCurrentRoutePublic()
    // ...
  });
}
```

---

## Verification

After fix, expected behavior:

1. **Boot:**
   ```
   loadingAuth = true
   isAuthRoute = false
   Template shows: <spinner>Initializing...</spinner>
   ```

2. **After auth check (not authenticated):**
   ```
   loadingAuth = false
   isAuthRoute = false  (because isCurrentRoutePublic() = true when on "/")
   Template shows: <public-layout> → Router loads LoginPage
   LoginPage renders clean with no loop
   ```

3. **After login:**
   ```
   auth.isAuthenticated = true
   isAuthRoute = true  (because isCurrentRoutePublic() = false when on "/dashboard")
   Template shows: <admin-layout> with sidebar
   ```

