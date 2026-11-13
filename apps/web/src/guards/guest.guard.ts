import { resolve } from 'aurelia';
import { AuthService } from '@/services/auth';

/**
 * Guest Guard
 * ===========
 * Redirects authenticated users from guest-only pages (landing, login).
 * Used to prevent authenticated users from seeing login page.
 * 
 * Usage:
 * {
 *   path: 'login',
 *   component: LoginPage,
 *   data: { guestOnly: true }
 * }
 */
export class GuestGuard {
  private readonly auth = resolve(AuthService);

  async canLoad(_vm: any, _params: any, next: any): Promise<boolean | string> {
    // Check if route is guest-only
    if (!next.data?.guestOnly) {
      return true; // Not guest-only
    }

    // Check authentication
    const isAuthenticated = await this.auth.refresh();

    if (!isAuthenticated) {
      return true; // Not authenticated, allow
    }

    // Authenticated user on guest page, redirect to dashboard
    console.info('[GuestGuard] Redirecting authenticated user to dashboard');
    return '/dashboard';
  }
}
