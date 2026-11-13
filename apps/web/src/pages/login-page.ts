import { customElement, resolve } from 'aurelia';
import template from './login-page.html';
import { loginSchema } from '@aureliajs/shared';
import { ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';

const DEMO_EMAIL = 'demo@aureliajs.dev';
const DEMO_PASSWORD = 'demo-password-123';

@customElement({ name: 'login-page', template })
export class LoginPage {
  private readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);

  email = '';
  password = '';
  submitting = false;
  error = '';
  fieldErrors: Record<string, string> = {};

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  async attached(): Promise<void> {
    // If already authenticated, redirect immediately
    if (await this.auth.refresh()) {
      await this.redirectAfterLogin();
    }
  }

  /**
   * Get return URL from query params or default to overview.
   * Supports deep linking after login.
   * Returns route name WITHOUT leading slash (Aurelia router convention).
   */
  private getReturnUrl(): string {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    
    // Validate returnUrl to prevent open redirect
    if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      // Strip leading slash — Aurelia router.load() expects route name, not absolute path
      return returnUrl.slice(1);
    }
    
    return 'overview';
  }

  /**
   * Redirect to intended destination after login.
   * Uses window.location for a clean full-page navigation — this ensures
   * the app re-bootstraps with fresh auth state, no guard race conditions.
   * This is the same pattern Next.js, Rails, and production SPAs use.
   */
  private async redirectAfterLogin(): Promise<void> {
    const returnUrl = this.getReturnUrl();
    window.location.href = `/${returnUrl}`;
  }

  useDemoAccount(): void {
    this.email = DEMO_EMAIL;
    this.password = DEMO_PASSWORD;
    this.fieldErrors = {};
    this.error = '';
  }

  async submit(): Promise<void> {
    this.error = '';
    this.fieldErrors = {};

    const parsed = loginSchema.safeParse({ email: this.email, password: this.password });
    if (!parsed.success) {
      this.fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.map(String).join('.'), issue.message]),
      );
      return;
    }

    this.submitting = true;
    try {
      await this.auth.login(parsed.data.email, parsed.data.password);
      await this.redirectAfterLogin(); // Use returnUrl from query params
    } catch (cause) {
      if (cause instanceof ApiError) {
        this.error =
          cause.status === 401
            ? this.i18n.t('login.failed')
            : cause.status === 0
              ? 'Cannot reach the API. Is `pnpm dev:api` running?'
              : cause.message;
      } else {
        this.error = this.i18n.t('common.error');
      }
    } finally {
      this.submitting = false;
    }
  }
}
