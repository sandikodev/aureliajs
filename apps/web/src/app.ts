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
import { getRouterConfig, PUBLIC_ROUTES, type RouteDefinition } from '@/config/routes';

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

  /**
   * CRITICAL: Loading state that delays any render until auth check completes.
   * This prevents the flicker where sidebar renders, then collapses when auth resolves.
   * Default: true — nothing renders until auth.refresh() finishes.
   */
  loadingAuth = true;

  /**
   * CRITICAL: isAuthRoute determines layout rendering.
   * Default: false — renders loading spinner or public layout.
   * Set to true only AFTER auth.refresh() completes AND route is protected.
   * Computed from router state + auth status, not URL pathname.
   */
  isAuthRoute = false;

  /**
   * The translator, exposed through a view-model getter.
   *
   * Aurelia observes getters on a view model but not on an injected
   * service, so a template binding of `i18n.t(...)` would never
   * re-evaluate when the locale changes. Routing the call through this
   * getter makes the dependency observable.
   */
  get t() {
    this.i18n.track();
    return this.i18n.t;
  }

  /**
   * The message catalog, exposed the same way.
   *
   * Templates use `copy['some.key']` rather than `t('some.key')`: a binding
   * that *calls* a function returned by a getter does not re-evaluate when
   * the getter is invalidated, while a binding that reads a property of the
   * returned object does.
   */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  /** The account menu label, with the user's name interpolated. */
  get accountMenuText(): string {
    this.i18n.track();
    return this.i18n.t('app.accountMenu', { name: this.auth.user?.name ?? '?' });
  }

  /** The languages offered in the account menu. */
  readonly localeOptions = LOCALES;

  /**
   * Switch the language from anywhere in the app.
   *
   * The choice is written to the workspace as well as to localStorage, so a
   * teammate on the same workspace sees the same language.
   */
  async changeLocale(locale: Locale): Promise<void> {
    if (locale === this.i18n.locale) return;

    this.i18n.setLocale(locale);

    // Close the menu the button lives in — leaving it open over the page
    // after the labels under it have just changed is jarring.
    const menu = (document.activeElement as HTMLElement | null)?.closest('details');
    menu?.removeAttribute('open');

    try {
      await api.updateWorkspace({ settings: { locale } });
    } catch {
      console.warn('[app] could not persist the locale preference');
    }
  }

  /**
   * A getter, not a field: the labels come from the message catalog, so the
   * navigation has to re-read them when the locale changes.
   */
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
  /** Recent audit entries, shown in the notification bell. */
  activity: ActivityItem[] = [];
  /** The workspaces the signed-in user belongs to. */
  workspaces: WorkspaceSummary[] = [];
  switchingWorkspace = false;
  creatingWorkspace = false;
  workspaceError = '';
  newWorkspace = { name: '' };
  workspaceDialogEl!: HTMLDialogElement;

  private hasNavigated = false;

  /**
   * CRITICAL MIDDLEWARE SEQUENCE (Fixed flicker issue):
   *
   * 1. loadingAuth = true (blocks all rendering)
   * 2. Set up auth error handler + router listener
   * 3. AWAIT auth.refresh() + checkApi() — no render happens yet
   * 4. Determine if current route is public or protected
   * 5. Set isAuthRoute based on auth status + route type
   * 6. Set loadingAuth = false — NOW layout renders with correct state
   * 7. Load activity + workspaces in background
   *
   * Result: No flicker, no race conditions, proper loading indicator.
   */
  async attached(): Promise<void> {
    // Step 2: Set up auth error handler
    setUnauthorizedHandler(() => {
      this.auth.clear();
      // Only redirect if NOT on a public route
      if (!this.isCurrentRoutePublic()) {
        void this.router.load('login');
      }
    });

    // Set up router event listener
    this.subscription = this.events.subscribe('au:router:navigation-end', () => {
      this.updateLayoutState();
      this.closeSidebar();

      if (this.hasNavigated) {
        this.focusPageHeading();
      }
      this.hasNavigated = true;

      // Only load activity if authenticated AND on protected route
      if (this.auth.isAuthenticated && !this.isCurrentRoutePublic()) {
        void this.loadActivity();
      }
    });

    // Step 3: WAIT for auth check + API health check
    // This blocks render because loadingAuth is still true
    await Promise.all([this.auth.refresh(), this.checkApi()]);

    // Step 4: Determine layout state
    this.updateLayoutState();

    // Step 5: Auto-redirect authenticated users from landing to overview
    // Only on initial load — after this, router events handle navigation
    if (this.auth.isAuthenticated) {
      const instruction = (this.router as any).activeInstruction;
      const landingPageComponent = PUBLIC_ROUTES[0]?.component;
      const isOnLandingPage = instruction?.component === landingPageComponent;
      
      if (isOnLandingPage) {
        await this.router.load('overview');
        return; // Navigation happened, rest will run on next cycle
      }
    }

    // Step 6: NOW unblock render
    this.loadingAuth = false;

    // Step 7: Load activity + workspaces in background (don't block)
    if (this.auth.isAuthenticated) {
      await Promise.all([this.loadActivity(), this.loadWorkspaces()]);
    }
  }

  /**
   * Determine if the current route is a public route.
   * CRITICAL: Must be called AFTER router initialization.
   *
   * Strategy (in order of reliability):
   * 1. During boot (loadingAuth=true): treat as public (show spinner)
   * 2. Check router's activeInstruction.component against PUBLIC_ROUTES
   * 3. Fallback: check window.location.pathname against known public paths
   *    This covers the case where router hasn't set activeInstruction yet
   *    (e.g. immediately after a full-page reload from window.location.href)
   */
  private isCurrentRoutePublic(): boolean {
    if (this.loadingAuth) return true;

    // Primary: check router's active instruction component
    try {
      const instruction = (this.router as any).activeInstruction;
      if (instruction?.component) {
        return PUBLIC_ROUTES.some((route) => route.component === instruction.component);
      }
    } catch {
      // fall through to URL fallback
    }

    // Fallback: check URL pathname — reliable even before router resolves
    const path = window.location.pathname.replace(/^\//, ''); // strip leading /
    const publicPaths = new Set(
      PUBLIC_ROUTES.map((r) => (Array.isArray(r.path) ? r.path[0] : r.path))
    );
    return publicPaths.has(path) || path === '';
  }

  /**
   * Update isAuthRoute based on current authentication and route type.
   * Called after auth.refresh() or on route navigation.
   */
  private updateLayoutState(): void {
    // Show admin layout only if:
    // 1. User is authenticated
    // 2. Current route is NOT a public route
    this.isAuthRoute = this.auth.isAuthenticated && !this.isCurrentRoutePublic();
  }

  /** The workspaces the signed-in user belongs to, for the switcher. */
  private async loadWorkspaces(): Promise<void> {
    try {
      const result = await api.workspaces();
      this.workspaces = result.workspaces;
    } catch {
      this.workspaces = [];
    }
  }

  /**
   * Switch the active workspace.
   *
   * The session row stores the active workspace, so the switch is a server
   * round trip — not a client-side variable. After the switch the whole
   * overview reloads against the new tenant.
   */
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

  /** Recent audit entries for the notification bell. */
  private async loadActivity(): Promise<void> {
    try {
      const overview = await api.overview('last-7');
      this.activity = overview.activity ?? [];
    } catch {
      this.activity = [];
    }
  }

  /** The red dot only shows when something happened in the last day. */
  get hasRecentActivity(): boolean {
    const cutoff = Date.now() - 86_400_000;
    return this.activity.some((item) => new Date(item.createdAt).getTime() > cutoff);
  }

  /** "2 hours ago" — a template expression can only call view-model members. */
  relativeTime(iso: string): string {
    return relativeTime(iso);
  }

  /** Check if the API is reachable. */
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

  /**
   * Move focus to the main region.
   *
   * Two things go wrong if this is left to the anchor's default behaviour:
   * the Aurelia router intercepts the click and treats `#main-content` as a
   * route change, and the resulting `navigation-end` hands focus straight
   * back to the page heading. So the click is handled explicitly, the event
   * is not allowed to bubble, and focus only moves to main if we are already
   * on the page.
   */
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

  focusPageHeading(): void {
    (document.querySelector('main > [role="region"] > h1') as HTMLElement | null)?.focus();
  }

  submitSearch(): void {
    if (!this.search.trim()) return;
    void this.router.load(`projects?q=${encodeURIComponent(this.search)}`);
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.load('login');
  }
}
