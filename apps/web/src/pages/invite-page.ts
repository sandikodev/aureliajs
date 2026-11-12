import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router';
import template from './invite-page.html';
import { api, ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';

@customElement({ name: 'invite-page', template })
export class InvitePage {
  private readonly router = resolve(IRouter);
  private readonly auth = resolve(AuthService);

  state: 'working' | 'accepted' | 'failed' = 'working';
  error = '';
  workspaceName = '';

  async attached(): Promise<void> {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      this.state = 'failed';
      this.error = 'This link is missing its invite token.';
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
      this.error =
        cause instanceof ApiError
          ? cause.message
          : 'Could not accept this invitation. It may have expired.';
    }
  }

  goToWorkspace(): void {
    void this.router.load('dashboard');
  }
}
