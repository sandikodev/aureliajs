import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { App } from './app';
import { BillingPage } from './pages/billing-page';
import { DashboardPage } from './pages/dashboard-page';
import { InvitePage } from './pages/invite-page';
import { LandingPage } from './pages/landing-page';
import { LoginPage } from './pages/login-page';
import { MembersPage } from './pages/members-page';
import { NotFoundPage } from './pages/not-found-page';
import { ProjectsPage } from './pages/projects-page';
import { SettingsPage } from './pages/settings-page';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';
import { AuthService } from './services/auth';
import { I18nService } from './services/i18n';
import { ThemeService } from './services/theme';
import { ToastService } from './services/toast';
import { UI } from './ui';
import './styles/main.css';

/**
 * Routed pages are registered globally so the router can resolve them by
 * custom-element name. Without this, navigation fails with AUR3174 and the
 * viewport stays empty.
 */
const PAGES = [
  LandingPage,
  LoginPage,
  InvitePage,
  DashboardPage,
  ProjectsPage,
  MembersPage,
  BillingPage,
  SettingsPage,
  NotFoundPage,
];

/**
 * Guards handle route protection automatically:
 * - AuthGuard: Protects authenticated routes, redirects to /login?returnUrl=...
 * - GuestGuard: Redirects authenticated users from public pages to /dashboard
 */
const GUARDS = [AuthGuard, GuestGuard];

void Aurelia.register(
  RouterConfiguration.customize({
    activeClass: 'is-active',
    useUrlFragmentHash: false, // Use pushState (clean URLs) instead of hash (#)
  }),
  ...PAGES,
  ...GUARDS, // Register guards for route protection
  ...UI,
  // One session cache shared by the shell and every page.
  AuthService,
  ThemeService,
  // One translation catalog instance shared by the shell and every page.
  I18nService,
  // Global toast notification service.
  ToastService,
)
  .app({ host: document.querySelector('app-root')!, component: App })
  .start();
