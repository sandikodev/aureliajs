import { customElement, resolve } from 'aurelia';
import template from './app.html';
import { IRouter, IRouterEvents, route } from '@aurelia/router';
import type { IDisposable } from 'aurelia';
import { api, setUnauthorizedHandler } from '@/services/api';
import { AuthService } from '@/services/auth';
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
  readonly nav: NavItem[] = [
    { href: 'dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
    { href: 'projects', label: 'Projects', icon: 'folder' },
    { href: 'members', label: 'Members', icon: 'users' },
    { href: 'billing', label: 'Billing', icon: 'creditCard' },
    { href: 'settings', label: 'Settings', icon: 'settings' },
  ];

  sidebarOpen = false;
  apiState: 'checking' | 'live' | 'demo' = 'checking';
  search = '';
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
    });

    const [authenticated] = await Promise.all([this.auth.refresh(), this.checkApi()]);

    if (!authenticated && !this.isAuthRoute) {
      await this.router.load('login');
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
