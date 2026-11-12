import { customElement, resolve } from 'aurelia';
import template from './app.html';
import { IRouter, IRouterEvents, route } from '@aurelia/router';
import type { IDisposable } from 'aurelia';
import { api, setUnauthorizedHandler, ApiError, type ActivityItem } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService, LOCALES } from '@/services/i18n';
import { relativeTime } from '@/lib/utils';
import type { Locale, WorkspaceSummary } from '@aureliajs/shared';
import { BillingPage } from '@/pages/billing-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { InvitePage } from '@/pages/invite-page';
import { LoginPage } from '@/pages/login-page';
import { MembersPage } from '@/pages/members-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { ProjectsPage } from '@/pages/projects-page';
import { SettingsPage } from '@/pages/settings-page';

export type NavItem = {
  href: string;
  label: string;
  icon: 'layoutDashboard' | 'folder' | 'users' | 'creditCard' | 'settings' | 'inbox';
  badge?: string;
};
/**
 * Routes that are reachable without a session and render without the admin
 * chrome. The invite link has to work for somebody who is not signed in yet
 * — that is the whole point of a magic link.
 */
const isPublicPath = (): boolean => /(^|\/)(login|invite)\/?$/.test(window.location.pathname);

@route({
  routes: [
    { path: 'login', component: LoginPage, title: 'Sign in' },
    { path: 'invite', component: InvitePage, title: 'Accept invitation' },
    { path: ['', 'dashboard'], component: DashboardPage, title: 'Dashboard' },
    { path: 'projects', component: ProjectsPage, title: 'Projects' },
    { path: 'members', component: MembersPage, title: 'Members' },
    { path: 'billing', component: BillingPage, title: 'Billing' },
    { path: 'settings', component: SettingsPage, title: 'Settings' },
    { path: 'not-found', component: NotFoundPage, title: 'Not found' },
  ],
  // The router redirects unknown paths to this named route (see `fallback` docs).
  fallback: 'not-found',
})
@customElement({ name: 'app-root', template })
export class App {
  private readonly router = resolve(IRouter);
  private readonly events = resolve(IRouterEvents);
  private subscription?: IDisposable;

  readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);

  /**
   * The translator, exposed through a view-model getter.
   *
   * Aurelia observes getters on a view model but not on an injected
   * service, so a template binding of `i18n.t(...)` would never
   * re-evaluate when the locale changes. Routing the call through this
   * getter makes the dependency observable.
   */
  get t() {
    // Read the locale inside this observed getter so the binding is
    // registered as a dependency of it.
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
      // The UI already switched; the preference simply did not persist.
      console.warn('[app] could not persist the locale preference');
    }
  }

  /**
   * A getter, not a field: the labels come from the message catalog, so the
   * navigation has to re-read them when the locale changes.
   */
  get nav(): NavItem[] {
    return [
      { href: 'dashboard', label: this.i18n.t('nav.dashboard'), icon: 'layoutDashboard' },
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
  workspaceNotice = '';
  newWorkspace = { name: '' };
  workspaceDialogEl!: HTMLDialogElement;
  /** Hides the admin chrome on the sign-in route (no double layout). */
  isAuthRoute = isPublicPath();
  /**
   * The first `navigation-end` is the initial page load, not a route change.
   * Moving focus on that one would set the browser's sequential focus
   * navigation starting point into the page body, so the very first Tab
   * would skip the "Skip to content" link.
   */
  private hasNavigated = false;

  async attached(): Promise<void> {
    setUnauthorizedHandler(() => {
      this.auth.clear();
      if (!isPublicPath()) void this.router.load('login');
    });

    this.subscription = this.events.subscribe('au:router:navigation-end', () => {
      this.isAuthRoute = isPublicPath();
      this.closeSidebar();

      if (this.hasNavigated) {
        this.focusPageHeading();
      }
      this.hasNavigated = true;

      void this.loadActivity();
    });

    const [authenticated] = await Promise.all([this.auth.refresh(), this.checkApi()]);

    if (!authenticated && !this.isAuthRoute) {
      await this.router.load('login');
      return;
    }

    await Promise.all([this.loadActivity(), this.loadWorkspaces()]);
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
   * dashboard reloads against the new tenant.
   */
  async switchTo(workspace: WorkspaceSummary): Promise<void> {
    if (workspace.isActive || this.switchingWorkspace) return;

    this.switchingWorkspace = true;
    try {
      const session = await api.switchWorkspace(workspace.id);
      this.auth.apply(session);
      await Promise.all([this.loadWorkspaces(), this.loadActivity()]);
      await this.router.load('dashboard');
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
      this.workspaceNotice = this.i18n.t('settings.workspaceCreated', { name });
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
      // The bell is decoration-free: if the API is down it shows nothing
      // rather than a stale list.
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
   * is stopped before it reaches the router's delegated listener, and the
   * URL is updated with `replaceState` — which does not fire `hashchange`.
   */
  skipToContent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const main = document.getElementById('main-content');
    if (!main) return;

    main.focus();
    main.scrollIntoView({ block: 'start' });

    // Keep the link honest — the address bar still shows the fragment, so it
    // can be copied and reloaded.
    history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#main-content`,
    );
  }

  /**
   * Move focus to the new page heading after a route change.
   *
   * A single-page app does not announce anything on navigation: the screen
   * reader keeps reading whatever was focused last, so the user never finds
   * out that the page changed. Focusing the `<h1>` gives them the page title
   * and puts the caret at the top of the new content.
   */
  private focusPageHeading(): void {
    // The viewport renders the new page asynchronously, so wait a tick.
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (!heading) return;

      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      heading.focus({ preventScroll: false });
    });
  }

  private async checkApi(): Promise<void> {
    try {
      const health = await api.health();
      this.apiState = health.ok ? 'live' : 'demo';
    } catch {
      this.apiState = 'demo';
    }
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.load('login');
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  async submitSearch(): Promise<void> {
    const q = this.search.trim();
    await this.router.load('projects', { queryParams: q ? { q } : {} });
    this.closeSidebar();
  }
}
