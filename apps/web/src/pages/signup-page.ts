import { customElement, resolve } from 'aurelia';
import template from './signup-page.html';
import { IRouter } from '@aurelia/router';
import type { IRouteViewModel } from '@aurelia/router';
import { registerSchema } from '@aurelia-ops/shared/schemas';
import { ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';

/**
 * Public signup. This is the only account-provisioning path in production —
 * there is no seeded demo user and no sample content behind it.
 */
@customElement({ name: 'signup-page', template })
export class SignupPage implements IRouteViewModel {
  private readonly auth = resolve(AuthService);
  private readonly router = resolve(IRouter);
  readonly i18n = resolve(I18nService);

  name = '';
  workspaceName = '';
  email = '';
  password = '';
  submitting = false;
  error = '';
  fieldErrors: Record<string, string> = {};

  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  async submit(): Promise<void> {
    this.error = '';
    this.fieldErrors = {};

    const parsed = registerSchema.safeParse({
      name: this.name,
      workspaceName: this.workspaceName,
      email: this.email,
      password: this.password,
    });
    if (!parsed.success) {
      this.fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.map(String).join('.'), issue.message]),
      );
      return;
    }

    this.submitting = true;
    try {
      await this.auth.signup(parsed.data);
      // A fresh account has exactly one (empty) workspace; no full reload.
      await this.router.load('overview');
    } catch (cause) {
      if (cause instanceof ApiError) {
        this.error =
          cause.status === 409
            ? this.i18n.t('signup.conflict')
            : cause.status === 0
              ? this.i18n.t('errors.apiUnreachable')
              : cause.message || this.i18n.t('signup.failed');
      } else {
        this.error = this.i18n.t('common.error');
      }
    } finally {
      this.submitting = false;
    }
  }
}
