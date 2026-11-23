import { customElement, resolve } from 'aurelia';
import template from './login-page.html';
import { IRouter } from '@aurelia/router';
import type { IRouteViewModel, Params } from '@aurelia/router';
import { loginSchema } from '@aurelia-ops/shared/schemas';
import { ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';

const DEMO_EMAIL = 'demo@aureliajs.dev';
const DEMO_PASSWORD = 'demo-password-123';

@customElement({ name: 'login-page', template })
export class LoginPage implements IRouteViewModel {
  private readonly auth = resolve(AuthService);
  private readonly router = resolve(IRouter);
  readonly i18n = resolve(I18nService);

  email = '';
  password = '';
  submitting = false;
  error = '';
  fieldErrors: Record<string, string> = {};
  returnUrl = '';

  loading(params: Params): void {
    if (params?.returnUrl) {
      this.returnUrl = String(params.returnUrl);
    }
  }

  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  /**
   * Get the return URL from query params.
   * Falls back to 'overview' if not present or unsafe.
   */
  private getReturnRoute(): string {
    const returnUrl =
      this.returnUrl ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('returnUrl') ?? ''
        : '');
    // Strip leading slashes to prevent protocol-relative redirects (e.g. //attacker.com)
    const route = returnUrl.replace(/^\/+/, '');
    // Safety: only allow relative alphanumeric routes with query params, no protocols or double-slashes
    const safe = /^[a-z0-9-/?=&]+$/i.test(route) && !route.includes('//') && !route.includes(':');
    return safe && route ? route : 'overview';
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
      // Use router.load() — stays in SPA, no full-page reload
      await this.router.load(this.getReturnRoute());
    } catch (cause) {
      if (cause instanceof ApiError) {
        this.error =
          cause.status === 401
            ? this.i18n.t('login.failed')
            : cause.status === 0
              ? 'Cannot reach the API. Is `bun run dev:api` running?'
              : cause.message;
      } else {
        this.error = this.i18n.t('common.error');
      }
    } finally {
      this.submitting = false;
    }
  }
}
