import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router';
import type { IRouteViewModel, Params } from '@aurelia/router';
import template from './invite-page.html';
import { api, ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';

@customElement({ name: 'invite-page', template })
export class InvitePage implements IRouteViewModel {
  private readonly router = resolve(IRouter);
  private readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  /** The confirmation, with the workspace name interpolated. */
  get acceptedText(): string {
    this.i18n.track();
    return this.i18n.t('invite.accepted', { workspace: this.workspaceName });
  }

  state: 'working' | 'accepted' | 'failed' = 'working';
  error = '';
  workspaceName = '';
  token = '';

  loading(params: Params): void {
    if (params?.token) {
      this.token = String(params.token);
    }
  }

  async attached(): Promise<void> {
    const token =
      this.token ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token')
        : null);
    if (!token) {
      this.state = 'failed';
      this.error = this.i18n.t('invite.failed');
      return;
    }

    try {
      const session = await api.acceptInvite(token);
      // The API set the session cookie; refresh so the shell picks it up.
      await this.auth.refresh();
      this.workspaceName = session.workspace?.name ?? 'the workspace';
      this.state = 'accepted';
    } catch (cause) {
      this.state = 'failed';
      this.error = cause instanceof ApiError ? cause.message : this.i18n.t('invite.expired');
    }
  }

  goToWorkspace(): void {
    void this.router.load('overview');
  }
}
