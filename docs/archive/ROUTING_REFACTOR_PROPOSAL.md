# 🏗️ Routing & Architecture Refactor Proposal

**Status:** PROPOSAL untuk review  
**Author:** System Analysis  
**Date:** 2026-11-13  

---

## 🎯 **MASALAH YANG AKAN DISELESAIKAN**

### **Current State (Anti-Patterns)**

```typescript
// app.ts - 300+ lines, God Object
export class App {
  // 15+ mixed responsibilities
  private loadingAuth = true;          // ← Manual flag
  private hasNavigated = false;        // ← Race condition prone
  private isAuthRoute = false;         // ← Duplicate router state
  private sidebarOpen = false;
  private workspaces: Workspace[] = [];
  private activity: Activity[] = [];
  // ... mixing auth, UI, data, routing

  async attached() {
    // 50+ lines mixing:
    // - Auth check
    // - API health
    // - Auto-redirect logic (race condition!)
    // - Data loading
    // - UI state
  }
}
```

**Masalah:**
1. ❌ **URL bukan source of truth** → Manual flags everywhere
2. ❌ **Tight coupling** → Auth/routing/UI/data di 1 class
3. ❌ **Race conditions** → `hasNavigated` flag bug prone
4. ❌ **No testability** → 300 lines, 15 dependencies
5. ❌ **Poor DX** → Trace 50 lines untuk understand flow
6. ❌ **No URL params** → Login redirect, query state tidak ada

---

## ✅ **SOLUSI: CLEAN ARCHITECTURE**

### **Design Principles**

```
1. URL IS THE SINGLE SOURCE OF TRUTH
   ├─ No manual flags (loadingAuth, hasNavigated, isAuthRoute)
   ├─ Guards handle routing logic
   ├─ Query params untuk state (returnUrl, tab, filters)
   └─ Browser history works naturally

2. SEPARATION OF CONCERNS
   ├─ Guards → Route protection
   ├─ Layouts → UI shells
   ├─ Services → Business logic
   └─ Components → Presentation

3. EXPLICIT DEPENDENCIES
   ├─ Constructor injection
   ├─ No hidden coupling
   └─ Testable in isolation
```

---

## 📐 **NEW ARCHITECTURE**

### **Directory Structure**

```
apps/web/src/
├── app.ts                    # ← 30 lines: Router setup only
├── app.html                  # ← 20 lines: Layout switching
│
├── guards/                   # ← Route protection
│   ├── auth.guard.ts         # Protect authenticated routes
│   └── guest.guard.ts        # Redirect authenticated users from login
│
├── layouts/                  # ← UI shells
│   ├── auth-layout.ts        # Sidebar + header (authenticated)
│   ├── auth-layout.html
│   ├── public-layout.ts      # Minimal (public pages)
│   └── public-layout.html
│
├── services/
│   ├── auth.service.ts       # ← Auth logic (exists)
│   └── router.service.ts     # ← Navigation helpers (new)
│
└── config/
    └── routes.ts             # ← Declarative routes
```

---

## 🔧 **IMPLEMENTATION DETAILS**

### **1. Guards (Route Protection)**

**AuthGuard** - Protect authenticated routes:
```typescript
export class AuthGuard {
  async canLoad(vm: any, params: any, next: any): Promise<boolean | string> {
    if (!next.data?.requiresAuth) return true;
    
    const isAuthenticated = await this.auth.refresh();
    if (isAuthenticated) return true;
    
    // Redirect to login WITH return URL
    const returnUrl = next.path || '/dashboard';
    return `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
}
```

**GuestGuard** - Redirect authenticated users:
```typescript
export class GuestGuard {
  async canLoad(vm: any, params: any, next: any): Promise<boolean | string> {
    if (!next.data?.guestOnly) return true;
    
    const isAuthenticated = await this.auth.refresh();
    if (!isAuthenticated) return true;
    
    // Authenticated user on login page → dashboard
    return '/dashboard';
  }
}
```

### **2. Routes Configuration**

```typescript
export const PUBLIC_ROUTES: RouteDefinition[] = [
  {
    path: '',
    component: LandingPage,
    title: 'Aurelia Ops',
    public: true,
    data: { guestOnly: true, layout: 'public' }
  },
  {
    path: 'login',
    component: LoginPage,
    title: 'Sign in',
    public: true,
    data: { guestOnly: true, layout: 'public' }
  },
  // invite tidak guestOnly - user bisa logout dulu
];

export const PROTECTED_ROUTES: RouteDefinition[] = [
  {
    path: 'dashboard',
    component: DashboardPage,
    title: 'Dashboard',
    data: { requiresAuth: true, layout: 'auth' }
  },
  // ... dst
];

export function getRouterConfig() {
  return {
    routes: [...PUBLIC_ROUTES, ...PROTECTED_ROUTES, ...FALLBACK],
    guardHooks: [AuthGuard, GuestGuard],
  };
}
```

### **3. Simplified App.ts**

**BEFORE (300+ lines):**
```typescript
export class App {
  // 15+ properties
  private loadingAuth = true;
  private hasNavigated = false;
  // ...

  async attached() {
    // 50+ lines manual routing logic
  }
}
```

**AFTER (30 lines):**
```typescript
@customElement({
  name: 'app-root',
  template,
  dependencies: [getRouterConfig().guardHooks]
})
export class App {
  private readonly auth = resolve(IAuthService);
  private readonly router = resolve(IRouter);
  
  // NO manual flags!
  // Guards handle everything
  
  configureRouter(config: RouterConfiguration) {
    config.useRouter({
      ...getRouterConfig(),
      useUrlFragmentHash: false,
      activeClass: 'is-active',
    });
  }
}
```

### **4. Layout Switching (app.html)**

```html
<div class="flex min-h-dvh bg-background">
  <!-- Skip link -->
  <a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>
  
  <!-- Global toast -->
  <ui-toaster></ui-toaster>
  
  <!-- Layout determined by route metadata -->
  <au-viewport name="main"></au-viewport>
</div>
```

Layouts di-render oleh router berdasarkan `data.layout`:
- `layout: 'auth'` → AuthLayout (sidebar + header)
- `layout: 'public'` → PublicLayout (minimal)

### **5. Login dengan Return URL**

**Flow:**
1. User di `/projects` (protected) → Not authenticated
2. `AuthGuard` redirect ke `/login?returnUrl=%2Fprojects`
3. User login
4. `LoginPage` read `returnUrl` dari query params
5. After login: `router.load(returnUrl || '/dashboard')`

**Code:**
```typescript
// login-page.ts
async submit() {
  await this.auth.login(this.email, this.password);
  
  // Get return URL from query params
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get('returnUrl') || '/dashboard';
  
  await this.router.load(returnUrl);
}
```

---

## 📊 **COMPARISON**

| Aspect | Current (Anti-Pattern) | After Refactor (Clean) |
|--------|------------------------|------------------------|
| **URL State** | ❌ No query params | ✅ returnUrl, tabs, filters |
| **Auth Check** | ❌ Manual in attached() | ✅ Guard automatic |
| **Redirect Logic** | ❌ 50 lines + flags | ✅ Guard 10 lines |
| **Race Conditions** | ❌ hasNavigated flag | ✅ None - guards handle |
| **Testing** | ❌ 300 lines untestable | ✅ Each guard testable |
| **DX** | ❌ Trace 50 lines | ✅ Read route config |
| **Browser History** | ❌ Broken by flags | ✅ Works naturally |
| **LOC (app.ts)** | ❌ 300+ lines | ✅ 30 lines |

---

## 🚀 **MIGRATION PLAN**

### **Phase 1: Guards** ✅ (Already Created)
- [x] Create `guards/auth.guard.ts`
- [x] Create `guards/guest.guard.ts`

### **Phase 2: Routes**
- [ ] Update `config/routes.ts` dengan guard metadata
- [ ] Add `returnUrl` support di LoginPage
- [ ] Remove manual `isPublicRoute()` checks

### **Phase 3: Layouts**
- [ ] Extract `layouts/auth-layout.ts` (sidebar + header)
- [ ] Extract `layouts/public-layout.ts` (minimal)
- [ ] Remove layout logic dari `app.html`

### **Phase 4: Simplify App.ts**
- [ ] Remove manual flags (`loadingAuth`, `hasNavigated`, `isAuthRoute`)
- [ ] Remove auto-redirect logic (guards handle ini)
- [ ] Keep only router config + router event subscriptions

### **Phase 5: Testing**
- [ ] Write guard unit tests
- [ ] Write layout integration tests
- [ ] Update E2E tests

---

## ⚠️ **BREAKING CHANGES**

1. **URL Structure:**
   - Login now has `?returnUrl=` query param
   - Dashboard might have `?tab=` for active section

2. **Component Lifecycle:**
   - Pages no longer check `isPublicRoute()` manually
   - Auth state comes from guards only

3. **Router Events:**
   - No more manual `hasNavigated` flag
   - Use router lifecycle hooks instead

---

## 🎯 **BENEFITS**

1. ✅ **URL is source of truth** → Browser history works
2. ✅ **No race conditions** → Guards are sequential
3. ✅ **Testable** → Each guard in isolation
4. ✅ **Better UX** → Deep linking, back button, share URLs
5. ✅ **Clean code** → 30 lines vs 300 lines
6. ✅ **Better DX** → Read config, not trace 50 lines

---

## 📝 **NEXT STEPS**

1. **Review** proposal ini
2. **Approve** atau request changes
3. **Implement** phase-by-phase
4. **Test** each phase
5. **Deploy** incrementally

---

## 🤔 **QUESTIONS FOR REVIEW**

1. Apakah arsitektur ini align dengan ekspektasi?
2. Apakah ada additional use case yang perlu di-cover?
3. Apakah migration path feasible?
4. Apakah breaking changes acceptable?

---

**Status:** Waiting for approval to proceed dengan implementation.
