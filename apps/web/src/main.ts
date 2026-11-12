import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { App } from './app';
import { BillingPage } from './pages/billing-page';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { MembersPage } from './pages/members-page';
import { NotFoundPage } from './pages/not-found-page';
import { ProjectsPage } from './pages/projects-page';
import { SettingsPage } from './pages/settings-page';
import { AuthService } from './services/auth';
import { ThemeService } from './services/theme';
import { UI } from './ui';
import './styles/main.css';

/**
 * Routed pages are registered globally so the router can resolve them by
 * custom-element name. Without this, navigation fails with AUR3174 and the
 * viewport stays empty.
 */
const PAGES = [
  LoginPage,
  DashboardPage,
  ProjectsPage,
  MembersPage,
  BillingPage,
  SettingsPage,
  NotFoundPage,
];

void Aurelia.register(
  RouterConfiguration.customize({
    activeClass: 'is-active',
  }),
  ...PAGES,
  ...UI,
  // One session cache shared by the shell and every page.
  AuthService,
  ThemeService,
)
  .app({ host: document.querySelector('app-root')!, component: App })
  .start();
