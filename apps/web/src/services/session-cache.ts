/**
 * Session Cache Service
 * 
 * PROBLEM: Every page reload shows a spinner while auth.refresh() waits for server.
 * This creates a terrible UX flicker even on instant networks (100ms is NOTICEABLE).
 * 
 * SOLUTION: Cache session data in localStorage + service worker.
 * - On first page load: use cached session to render immediately
 * - In background: refresh session from server
 * - If refresh fails or session expired: clear cache + force login
 * 
 * Result: First page load is INSTANT (no spinner), then validates in background.
 */

import type { User, Workspace } from '@aureliajs/shared';

export interface CachedSession {
  user: User | null;
  workspace: Workspace | null;
  token: string;
}

const CACHE_KEY = 'aurelia-session-cache';
const CACHE_VALIDITY = 24 * 60 * 60 * 1000; // 24 hours

interface StoredSession extends CachedSession {
  expiresAt: number; // timestamp for cache expiry
}

/**
 * Get cached session if it exists and hasn't expired.
 * Returns null if cache is stale or invalid.
 */
export function getCachedSession(): CachedSession | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const session: StoredSession = JSON.parse(cached);

    // Check if cache has expired
    if (session.expiresAt < Date.now()) {
      clearSessionCache();
      return null;
    }

    return { user: session.user, workspace: session.workspace, token: session.token };
  } catch {
    // Corrupted cache, clear it
    clearSessionCache();
    return null;
  }
}

/**
 * Save session to cache.
 * Called after successful auth.refresh() from server.
 */
export function cacheSession(session: CachedSession): void {
  try {
    const stored: StoredSession = {
      ...session,
      expiresAt: Date.now() + CACHE_VALIDITY,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage quota exceeded, ignore
    console.warn('[session-cache] Failed to save session cache (quota?)');
  }
}

/**
 * Clear cached session (called on logout or session expiry).
 */
export function clearSessionCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if we should use cached session on page load.
 * 
 * Returns true if:
 * - Cache exists and hasn't expired
 * - We're not already on a login page (no point caching login redirects)
 */
export function shouldUseCachedSession(): boolean {
  const cached = getCachedSession();
  if (!cached) return false;

  // Don't use cache if already on login/invite page
  const path = window.location.pathname;
  if (path === '/login' || path === '/invite') return false;

  return true;
}
