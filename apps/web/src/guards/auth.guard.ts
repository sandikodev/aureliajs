import { resolve } from 'aurelia';
import { AuthService } from '@/services/auth';

/**
 * Auth Guard
 * ==========
 * Protects authenticated routes.
 * Redirects to /login if not authenticated.
 * Stores intended destination in URL for post-login redirect.
 * 
 * Usage:
 * {
 *   path: 'dashboard',
 *   component: DashboardPage,
 *   data: { requiresAuth: true }
 * }
 */
export class AuthGuard {
  private readonly auth = resolve(AuthService);

  async canLoad(_vm: any, _params: any, next: any): Promise<boolean | string> {
    // Check if route requires auth
    if (!next.data?.requiresAuth) {
      return true; // Public route
    }

    // Check authentication
    const isAuthenticated = await this.auth.refresh();

    if (isAuthenticated) {
      return true; // Authenticated, allow
    }

    // Not authenticated, redirect to login with return URL
    const returnUrl = next.path || '/dashboard';
    console.info('[AuthGuard] Redirecting to login', { returnUrl });
    
    return `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
}
