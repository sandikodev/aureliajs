import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { App } from './app';
import { LandingPage } from './pages/landing-page';
import { LoginPage } from './pages/login-page';
import { InvitePage } from './pages/invite-page';
import { OverviewPage } from './pages/overview-page';
import { ProjectsPage } from './pages/projects-page';
import { MembersPage } from './pages/members-page';
import { BillingPage } from './pages/billing-page';
import { SettingsPage } from './pages/settings-page';
import { NotFoundPage } from './pages/not-found-page';
import { AuthService } from './services/auth';
import { I18nService } from './services/i18n';
import { ThemeService } from './services/theme';
import { ToastService } from './services/toast';
import { UI } from './ui';
import './styles/main.css';

/**
 * Pages must be registered globally so the router can resolve them by
 * custom-element name. Without this, navigation fails with AUR3174.
 */
const PAGES = [
  LandingPage, LoginPage, InvitePage,
  OverviewPage, ProjectsPage, MembersPage, BillingPage, SettingsPage,
  NotFoundPage,
];

void Aurelia.register(
  RouterConfiguration.customize({
    activeClass: 'is-active',
    useUrlFragmentHash: false, // pushState — clean URLs, no hash fragments
  }),
  ...PAGES,
  ...UI,
  AuthService,
  ThemeService,
  I18nService,
  ToastService,
)
  .app({ host: document.querySelector('app-root')!, component: App })
  .start();
