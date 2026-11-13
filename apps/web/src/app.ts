import { customElement, resolve } from 'aurelia';
import { IRouter, IRouterEvents, route } from '@aurelia/router';
import type { IDisposable } from 'aurelia';
import template from './app.html';
import { api, setUnauthorizedHandler, ApiError, type ActivityItem } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService, LOCALES } from '@/services/i18n';
import { ToastService } from '@/services/toast';
import { relativeTime } from '@/lib/utils';
import type { Locale, WorkspaceSummary } from '@aureliajs/shared';
import { getRouterConfig, PUBLIC_ROUTE_PATHS } from '@/config/routes';
import { ThemeService } from '@/services/theme';

export type NavItem = {
  href: string;
  label: string;
  icon: 'layoutDashboard' | 'folder' | 'users' | 'creditCard' | 'settings' | 'inbox';
  badge?: string;
};

const config = getRouterConfig();

@route(config)
@customElement({ name: 'app-root', template })
export class App {
  private readonly router = resolve(IRouter);
  private readonly events = resolve(IRouterEvents);
  private subscription?: IDisposable;

  readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);
  readonly toast = resolve(ToastService);
  readonly theme = resolve(ThemeService);

  /**
   * True while the initial auth check is in flight.
   * Template renders a full-screen spinner and nothing else.
   * Set to false exactly once — after auth.refresh() completes.
   */
  loadingAuth = true;

  get t() {
    this.i18n.track();
    return this.i18n.t;
  }

  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  get accountMenuText(): string {
    this.i18n.track();
    return this.i18n.t('app.accountMenu', { name: this.auth.user?.name ?? '?' });
  }

  readonly localeOptions = LOCALES;

  async changeLocale(locale: Locale): Promise<void> {
    if (locale === this.i18n.locale) return;
    this.i18n.setLocale(locale);
    const menu = (document.activeElement as HTMLElement | null)?.closest('details');
    menu?.removeAttribute('open');
    try {
      await api.updateWorkspace({ settings: { locale } });
    } catch {
      console.warn('[app] could not persist the locale preference');
    }
  }

  get nav(): NavItem[] {
    return [
      { href: 'overview', label: this.i18n.t('nav.overview'), icon: 'layoutDashboard' },
      { href: 'projects', label: this.i18n.t('nav.projects'), icon: 'folder' },
      { href: 'members', label: this.i18n.t('nav.members'), icon: 'users' },
      { href: 'billing', label: this.i18n.t('nav.billing'), icon: 'creditCard' },
      { href: 'settings', label: this.i18n.t('nav.settings'), icon: 'settings' },
    ];
  }

  sidebarOpen = false;
  apiState: 'checking' | 'live' | 'demo' = 'checking';
  search = '';
  activity: ActivityItem[] = [];
  workspaces: WorkspaceSummary[] = [];
  switchingWorkspace = false;
  creatingWorkspace = false;
  workspaceError = '';
  newWorkspace = { name: '' };
  workspaceDialogEl!: HTMLDialogElement;

  /**
   * Whether the authenticated shell (sidebar + header) should render.
   * Plain property — set explicitly after boot and on every navigation-end.
   * NOT a computed getter: window.location is not observable by Aurelia.
   */
  showShell = false;

  private updateShell(): void {
    this.showShell = this.auth.isAuthenticated && !this.isPublicPath(window.location.pathname);
  }

  /**
   * Returns true for paths that belong to public routes:
   * '' (landing), 'login', 'invite'.
   */
  private isPublicPath(pathname: string): boolean {
    const path = pathname.replace(/^\//, '');
    return PUBLIC_ROUTE_PATHS.has(path as any) || path === '';
  }

  /**
   * Boot sequence — runs once after component attaches.
   *
   * While loadingAuth is true the template only shows a spinner.
   * No layout is rendered, so there is nothing to flicker.
   *
   * 1. Await auth.refresh() (single server round-trip, no cache)
   * 2. Redirect if necessary:
   *    - authenticated + public path  → /overview
   *    - unauthenticated + protected path → /login?returnUrl=...
   * 3. Set loadingAuth = false → showShell evaluates with correct state
   * 4. Load background data
   */
  async attached(): Promise<void> {
    setUnauthorizedHandler(() => {
      this.auth.clear();
      if (!this.isPublicPath(window.location.pathname)) {
        void this.router.load('login');
      }
    });

    this.subscription = this.events.subscribe('au:router:navigation-end', () => {
      this.updateShell();
      this.closeSidebar();
      if (this.auth.isAuthenticated && !this.isPublicPath(window.location.pathname)) {
        void this.loadActivity();
      }
    });

    // Single server round-trip — no localStorage cache, no race condition
    const [authenticated] = await Promise.all([this.auth.refresh(), this.checkApi()]);

    const onPublicPath = this.isPublicPath(window.location.pathname);

    if (authenticated && onPublicPath) {
      // Authenticated user on landing / login → send to app
      await this.router.load('overview');
    } else if (!authenticated && !onPublicPath) {
      // Unauthenticated user on a protected URL → send to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      await this.router.load(`login?returnUrl=${returnUrl}`);
    }

    // Unblock rendering — updateShell() sets correct layout state
    this.loadingAuth = false;
    this.updateShell();

    if (authenticated) {
      void Promise.all([this.loadActivity(), this.loadWorkspaces()]);
    }
  }

  private async loadWorkspaces(): Promise<void> {
    try {
      const result = await api.workspaces();
      this.workspaces = result.workspaces;
    } catch {
      this.workspaces = [];
    }
  }

  async switchTo(workspace: WorkspaceSummary): Promise<void> {
    if (workspace.isActive || this.switchingWorkspace) return;
    this.switchingWorkspace = true;
    try {
      const session = await api.switchWorkspace(workspace.id);
      this.auth.apply(session);
      await Promise.all([this.loadWorkspaces(), this.loadActivity()]);
      await this.router.load('overview');
    } catch (error) {
      this.workspaceError =
        error instanceof ApiError ? error.message : 'Could not switch workspace.';
    } finally {
      this.switchingWorkspace = false;
    }
  }

  createWorkspace(): void {
    this.workspaceError = '';
    this.newWorkspace = { name: '' };
    this.workspaceDialogEl.showModal();
  }

  async saveWorkspace(): Promise<void> {
    this.workspaceError = '';
    const name = this.newWorkspace.name.trim();
    if (name.length < 2) {
      this.workspaceError = this.i18n.t('settings.nameTooShort');
      return;
    }
    this.creatingWorkspace = true;
    try {
      const { workspace } = await api.createWorkspace({ name });
      this.workspaceDialogEl.close();
      await this.loadWorkspaces();
      await this.switchTo(workspace);
      this.toast.success(this.i18n.t('settings.workspaceCreated', { name }));
    } catch (error) {
      this.workspaceError =
        error instanceof ApiError ? error.message : 'Could not create the workspace.';
    } finally {
      this.creatingWorkspace = false;
    }
  }

  private async loadActivity(): Promise<void> {
    try {
      const overview = await api.overview('last-7');
      this.activity = overview.activity ?? [];
    } catch {
      this.activity = [];
    }
  }

  get hasRecentActivity(): boolean {
    const cutoff = Date.now() - 86_400_000;
    return this.activity.some((item) => new Date(item.createdAt).getTime() > cutoff);
  }

  relativeTime(iso: string): string {
    return relativeTime(iso);
  }

  private async checkApi(): Promise<void> {
    try {
      await api.health();
      this.apiState = 'live';
    } catch {
      this.apiState = 'demo';
    }
  }

  detached(): void {
    this.subscription?.dispose();
    setUnauthorizedHandler(null);
  }

  skipToContent(event: MouseEvent): void {
    if (event.currentTarget !== event.target) return;
    event.preventDefault();
    (document.getElementById('main-content') as HTMLElement | null)?.focus();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  submitSearch(): void {
    if (!this.search.trim()) return;
    void this.router.load(`projects?q=${encodeURIComponent(this.search)}`);
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.load('login');
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      'project.created': 'created a project',
      'project.updated': 'updated a project',
      'project.deleted': 'deleted a project',
      'project.status_changed': 'changed a status',
      'member.invited': 'invited a teammate',
      'member.invite_accepted': 'accepted an invitation',
      'member.invite_revoked': 'revoked an invitation',
      'member.role_changed': 'changed a role',
      'member.removed': 'removed a member',
      'billing.checkout_started': 'started a checkout',
      'billing.plan_activated': 'activated a plan',
      'billing.plan_changed': 'changed the plan',
      'billing.invoice_paid': 'paid an invoice',
      'billing.invoice_failed': 'had a failed invoice',
      'workspace.updated': 'updated the workspace',
      'workspace.created': 'created a workspace',
    };
    return map[action] ?? action;
  }
}
