import type { AuthSession, Role, User, Workspace } from '@aurelia-ops/shared';
import { observable } from 'aurelia';
import { initials } from '@/lib/utils';
import { api } from './api';

const empty: AuthSession = { user: null, workspace: null, role: null };

/**
 * Authentication Service
 * ======================
 * Single source of truth for auth state.
 *
 * Simple rules:
 * - `refresh()` calls /api/auth/me — always fresh from server
 * - `apply()` updates all fields atomically
 * - `clear()` resets to unauthenticated state
 * - No caching, no localStorage — server is the authority
 */
export class AuthService {
  @observable user: User | null = null;
  @observable workspace: Workspace | null = null;
  @observable role: Role | null = null;

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  get canManage(): boolean {
    return this.role === 'owner' || this.role === 'admin';
  }

  get initials(): string {
    return initials(this.user?.name ?? '?');
  }

  get workspaceInitials(): string {
    return initials(this.workspace?.name ?? '?');
  }

  apply(session: AuthSession): void {
    this.user = session.user;
    this.workspace = session.workspace;
    this.role = session.role;
  }

  clear(): void {
    this.apply(empty);
  }

  /**
   * Check authentication status from server.
   * Always hits /api/auth/me — no local cache.
   * Returns true if a valid session cookie exists.
   */
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
