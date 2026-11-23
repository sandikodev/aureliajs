import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { App } from './app';
import { LandingPage } from './pages/landing-page';
import { AuthService } from './services/auth';
import { I18nService } from './services/i18n';
import { ThemeService } from './services/theme';
import { ToastService } from './services/toast';
import { UI } from './ui';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import './styles/main.css';

// Production-only, one-time instrumentation. In dev these would flood the
// console and pollute analytics with localhost hits.
if (import.meta.env.PROD) {
  inject();
  injectSpeedInsights();
}

/**
 * Landing stays eager: the router uses the default (`''`) route to resolve the
 * `fallback` page, and making it lazy breaks that resolution with AUR3174.
 * The static `/` never loads this entry at all — its prerendered HTML has no
 * SPA script, only a tiny inline CTA/bootstrap — so this costs nothing there.
 * Every other route component is a dynamic import in config/routes.ts.
 */
void Aurelia.register(
  RouterConfiguration.customize({
    activeClass: 'is-active',
    useUrlFragmentHash: false, // pushState — clean URLs, no hash fragments
  }),
  LandingPage,
  ...UI,
  AuthService,
  ThemeService,
  I18nService,
  ToastService,
)
  .app({ host: document.querySelector('app-root')!, component: App })
  .start();
