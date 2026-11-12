import { customElement, resolve } from 'aurelia';
import template from './login-page.html';
import { IRouter } from '@aurelia/router';
import { loginSchema } from '@aureliajs/shared';
import { ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';

const DEMO_EMAIL = 'demo@aureliajs.dev';
const DEMO_PASSWORD = 'demo-password-123';

@customElement({ name: 'login-page', template })
export class LoginPage {
  private readonly auth = resolve(AuthService);
  private readonly router = resolve(IRouter);

  email = '';
  password = '';
  submitting = false;
  error = '';
  fieldErrors: Record<string, string> = {};

  async attached(): Promise<void> {
    if (await this.auth.refresh()) {
      await this.router.load('dashboard');
    }
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
      await this.router.load('dashboard');
    } catch (cause) {
      if (cause instanceof ApiError) {
        this.error =
          cause.status === 401
            ? 'Email or password is incorrect.'
            : cause.status === 0
              ? 'Cannot reach the API. Is `pnpm dev:api` running?'
              : cause.message;
      } else {
        this.error = 'Could not sign in. Try again.';
      }
    } finally {
      this.submitting = false;
    }
  }
}
