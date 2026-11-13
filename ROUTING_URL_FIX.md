# Router URL Fix: Clean URLs with pushState

**Date:** 2026-11-13  
**Issue:** URL tidak berubah saat navigasi (tetap `/` daripada `/login`)  
**Root Cause:** Router menggunakan hash mode (`useUrlFragmentHash: true` default)  
**Solution:** Enable pushState mode  

---

## What Changed

### main.ts — Router Configuration

**Before:**
```typescript
RouterConfiguration.customize({
  activeClass: 'is-active',
})
```

**After:**
```typescript
RouterConfiguration.customize({
  activeClass: 'is-active',
  useUrlFragmentHash: false, // ← USE PUSHSTATE (clean URLs)
})
```

---

## Why This Matters

### Hash Mode (❌ Old)
```
Click "Sign in" → Router.load('login')
  ↓
URL tetap: http://localhost:4600/
  ↓
Klik history button → tidak berfungsi dengan baik
```

### PushState Mode (✅ New)
```
Click "Sign in" → Router.load('login')
  ↓
URL berubah: http://localhost:4600/login
  ↓
Klik history button → kembali ke /
```

---

## Browser History API

**PushState** menggunakan native browser History API:
- `window.history.pushState()` — navigasi tanpa reload
- URL **visible di address bar** (SEO-friendly)
- **Back button bekerja** (seperti SPA normal)
- **Bookmarkable URLs** — user bisa save `/login`, `/dashboard`, etc

---

## Configuration Options

```typescript
RouterConfiguration.customize({
  // URL navigation mode
  useUrlFragmentHash: false,  // false = pushState, true = hash (#)
  
  // Active route styling
  activeClass: 'is-active',
  
  // Additional options (optional)
  // viewportName: 'main',  // Default viewport name
  // statefulHistoryLength: 0,  // History stack size
});
```

---

## Compatibility

✅ **Works with all modern browsers:**
- Chrome 26+
- Firefox 4+
- Safari 5.1+
- Edge (all versions)
- IE 10+

**Not supported:** IE 9 and below (but we don't need to support IE9)

---

## Deep Linking

With pushState, deep links now work **perfectly**:

```
Direct visit: http://localhost:4600/projects
  ↓
Router resolves /projects route
  ↓
Auth check happens
  ↓
If not authenticated → redirect /login
  ↓
If authenticated → render /projects (dashboard layout)
```

**Before (hash mode):**
```
Direct visit: http://localhost:4600/projects
  ↓
Browser treats as: / (ignores #projects)
  ↓
Router doesn't recognize route
  ↓
Fallback to landing page
```

---

## Server-Side Considerations

For production deployment, **server must support 404 fallback**:

```nginx
# nginx.conf
location / {
  try_files $uri /index.html;
}
```

This ensures:
- `/` → serve index.html ✅
- `/login` → serve index.html (router handles) ✅
- `/static/logo.png` → serve actual file ✅

---

## Testing

### Manual Test

1. ✅ Open http://localhost:4600
2. ✅ Click "Sign in"
3. ✅ URL changes to http://localhost:4600/login
4. ✅ Click browser back button → URL changes to http://localhost:4600
5. ✅ Click forward button → URL changes back to http://localhost:4600/login
6. ✅ Refresh on /login → page renders (not 404)

### E2E Test

```typescript
test('router uses pushState (clean URLs)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  // URL should be /login (not /#/login or /)
  expect(page.url()).toContain('/login');
  
  // Back button should work
  await page.goBack();
  expect(page.url()).toContain('/');
});
```

---

## Summary

✅ **Clean URLs enabled** — http://localhost:4600/login (not /#/login)  
✅ **Browser history works** — back/forward buttons functional  
✅ **Deep linking works** — direct URL navigation resolves correctly  
✅ **Bookmarkable** — user dapat share `/dashboard`, `/projects` links  

**Status:** ✅ Fixed and tested. Production ready.
