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

// `/` ships build-time-rendered landing markup so crawlers and social
// previews see real content. The SPA mounts into the same host; drop the
// static copy first so there is never a duplicate page in the DOM.
document.querySelector('[data-ssr-landing]')?.remove();

/**
 * Only the landing page is eager. The router registers lazy route components
 * itself when it resolves their dynamic imports; registering them here would
 * pull every page back into the initial bundle.
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
