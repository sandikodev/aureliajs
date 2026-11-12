import type { AuthSession, Role, User, Workspace } from '@aureliajs/shared';
import { api } from './api';

const empty: AuthSession = { user: null, workspace: null, role: null };

/**
 * Session state for the app shell. One instance is registered in the DI
 * container, so every page and the shell read the same values.
 *
 * The server is the source of truth: `refresh()` calls `/api/auth/me` and the
 * fields below are only a cache for rendering.
 */
export class AuthService {
  user: User | null = null;
  workspace: Workspace | null = null;
  role: Role | null = null;
  ready = false;

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  get canManage(): boolean {
    return this.role === 'owner' || this.role === 'admin';
  }

  get initials(): string {
    return (this.user?.name ?? '?')
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  get workspaceInitials(): string {
    return (this.workspace?.name ?? '?')
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  apply(session: AuthSession): void {
    this.user = session.user;
    this.workspace = session.workspace;
    this.role = session.role;
    this.ready = true;
  }

  clear(): void {
    this.apply(empty);
  }

  /** Returns true when a valid session cookie exists. */
  async refresh(): Promise<boolean> {
    try {
      const session = await api.me();
      this.apply(session);
      return session.user !== null;
    } catch {
      this.clear();
      return false;
    }
  }

  async login(email: string, password: string): Promise<void> {
    const session = await api.login({ email, password });
    this.apply(session);
  }

  async logout(): Promise<void> {
    try {
      await api.logout();
    } finally {
      this.clear();
    }
  }
}
