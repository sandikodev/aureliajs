import { customElement, resolve, IEventAggregator } from 'aurelia';
import { IRouter, IRouterEvents, route } from '@aurelia/router';
import type { IDisposable } from 'aurelia';
import type { NavigationStartEvent, NavigationEndEvent } from '@aurelia/router';
import template from './app.html';
import { api, setUnauthorizedHandler, ApiError, type ActivityItem } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService, LOCALES, type MessageKey } from '@/services/i18n';
import { actionLabel as translateAction } from '@/lib/activity';
import { ToastService } from '@/services/toast';
import { relativeTime } from '@/lib/utils';
import type { Locale, WorkspaceSummary } from '@aurelia-ops/shared';
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
  private readonly ea = resolve(IEventAggregator);
  private subscriptions: IDisposable[] = [];
  /** Set while detaching so an in-flight boot cannot register leaks afterwards. */
  private detached = false;

  readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);
  readonly toast = resolve(ToastService);
  readonly theme = resolve(ThemeService);

  workspaceDetailsEl?: HTMLDetailsElement;
  accountDetailsEl?: HTMLDetailsElement;
  notificationDetailsEl?: HTMLDetailsElement;
  languageDetailsEl?: HTMLDetailsElement;
  mainContentEl?: HTMLElement;
  workspaceDialogEl!: HTMLDialogElement;

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

  closeAllMenus(): void {
    this.workspaceDetailsEl?.removeAttribute('open');
    this.accountDetailsEl?.removeAttribute('open');
    this.notificationDetailsEl?.removeAttribute('open');
    this.languageDetailsEl?.removeAttribute('open');
  }

  private readonly handleDocumentClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest('details')) {
      this.closeAllMenus();
    }
  };

  /**
   * Escape closes the mobile drawer and any open `<details>` menu. Native
   * `<dialog>` keeps handling its own Escape; this only covers the chrome.
   */
  private readonly handleGlobalKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    this.closeSidebar();
    this.closeAllMenus();
  };

  async changeLocale(locale: Locale): Promise<void> {
    this.closeAllMenus();
    if (locale === this.i18n.locale) return;
    this.i18n.setLocale(locale);
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

  /**
   * Whether the authenticated shell (sidebar + header) should render.
   * Determined strictly by the route: public routes (landing, login, invite) render
   * their own minimal/hero layouts, while all dashboard routes always render within
   * the persistent App Shell (sidebar + header), with live or demo data.
   */
  showShell = typeof window !== 'undefined' ? !this.isPublicPath(window.location.pathname) : false;

  private updateShell(currentPath?: string): void {
    const target = currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    this.showShell = !this.isPublicPath(target);
  }

  /**
   * Returns true for paths that belong to public routes:
   * '' (landing), 'login', 'invite'.
   */
  private isPublicPath(pathname: string): boolean {
    const path = pathname
      .replace(/^\//, '')
      .split('?')[0]!
      .split('#')[0]!
      .replace(/\/$/, '');
    return PUBLIC_ROUTE_PATHS.has(path) || path === '';
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
    this.detached = false;
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleGlobalKeydown);
    setUnauthorizedHandler(() => {
      this.auth.clear();
      if (!this.isPublicPath(window.location.pathname) && this.apiState === 'live') {
        void this.router.load('login');
      }
    });

    // Single server round-trip — no localStorage cache, no race condition
    const [authenticated] = await Promise.all([this.auth.refresh(), this.checkApi()]);
    // The shell can be torn down while those requests are in flight (fast
    // navigation, HMR, test teardown). Continuing would push subscriptions and
    // start background loads on a dead component.
    if (this.detached) return;

    const onPublicPath = this.isPublicPath(window.location.pathname);
    // Allow authenticated users to access /invite (accept invitation) without redirect
    const isInvitePath = window.location.pathname.replace(/^\//, '') === 'invite';

    if (authenticated && onPublicPath && !isInvitePath) {
      // Authenticated user on landing / login → send to app
      // But allow /invite so logged-in users can accept invitations
      await this.router.load('overview');
    } else if (!authenticated && !onPublicPath && this.apiState === 'live') {
      // Unauthenticated user on a protected URL when API is live → send to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      await this.router.load(`login?returnUrl=${returnUrl}`);
    }

    // Update shell state once target route is resolved
    this.updateShell();
    // Dismiss loading overlay only after the final layout and route have settled
    this.loadingAuth = false;

    if (authenticated) {
      void Promise.all([this.loadActivity(), this.loadWorkspaces()]);
    }

    // Subscribe to navigation events to eliminate layout flickers and sync data across transitions
    this.updateDocumentTitle();
    this.subscriptions.push(
      { dispose: this.i18n.onChange(() => this.updateDocumentTitle()) },
      this.ea.subscribe('workspace:updated', (updated: { id: string; name: string; slug: string }) => {
        if (this.auth.workspace && this.auth.workspace.id === updated.id) {
          this.auth.workspace = {
            ...this.auth.workspace,
            name: updated.name,
            slug: updated.slug,
          };
        }
        void this.loadWorkspaces();
      }),
      // 1. Navigation Start: Immediately toggle shell state to target route before viewport mounts
      this.events.subscribe('au:router:navigation-start', (event: NavigationStartEvent) => {
        try {
          const targetPath = event.instructions?.toPath?.();
          if (targetPath !== undefined) {
            this.updateShell(targetPath);
          }
        } catch {
          // fallback if instructions tree cannot be converted to path
        }
      }),
      // 2. Navigation End: Re-verify shell, close mobile drawer, sync workspace/activity data, and update document title
      this.events.subscribe('au:router:navigation-end', (event: NavigationEndEvent) => {
        try {
          const finalPath = event.finalInstructions?.toPath?.();
          this.updateShell(finalPath);
        } catch {
          this.updateShell();
        }
        this.closeSidebar();
        this.updateDocumentTitle();
        if (this.auth.isAuthenticated && !this.isPublicPath(window.location.pathname)) {
          void Promise.all([this.loadActivity(), this.loadWorkspaces()]);
        }
      }),
    );
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
        error instanceof ApiError ? error.message : this.i18n.t('errors.switchWorkspaceFailed');
    } finally {
      this.switchingWorkspace = false;
    }
  }

  createWorkspace(): void {
    this.workspaceError = '';
    this.newWorkspace = { name: '' };
    this.workspaceDetailsEl?.removeAttribute('open');
    this.workspaceDialogEl.showModal();
  }

  async saveWorkspace(event?: Event): Promise<void> {
    event?.preventDefault();
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
        error instanceof ApiError ? error.message : this.i18n.t('errors.createWorkspaceFailed');
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
    this.i18n.track();
    return relativeTime(iso, this.i18n.locale, this.i18n.t('common.justNow'));
  }

  private async checkApi(): Promise<void> {
    try {
      await api.health();
      this.apiState = 'live';
    } catch {
      this.apiState = 'demo';
    }
  }

  detaching(): void {
    this.detached = true;
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
    setUnauthorizedHandler(null);
  }

  skipToContent(event: MouseEvent): void {
    if (event.currentTarget !== event.target) return;
    event.preventDefault();
    this.mainContentEl?.focus();
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
    return translateAction(this.i18n, action);
  }

  private updateDocumentTitle(): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.replace(/^\//, '').split(/[?#]/)[0] || '';
    const titleKeys: Readonly<Record<string, MessageKey>> = {
      login: 'auth.signInTitle',
      invite: 'invite.title',
      overview: 'nav.overview',
      projects: 'nav.projects',
      members: 'nav.members',
      billing: 'nav.billing',
      settings: 'nav.settings',
    };
    const key = titleKeys[path];
    const title = key ? this.i18n.t(key) : 'Aurelia Ops';
    document.title = title === 'Aurelia Ops' ? title : `${title} · Aurelia Ops`;
  }
}
