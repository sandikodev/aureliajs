import { customElement } from 'aurelia';
import template from './landing-page.html';

/**
 * Landing page — public, unauthenticated route.
 * Hero section, feature showcase, CTA to sign in or GitHub.
 * Renders in minimal layout (no sidebar, no admin chrome).
 *
 * Deliberately has no DI dependencies: the build-time prerender renders this
 * same component through `@aureliajs/ssr`, so there is only one source of
 * truth for the landing markup.
 */
@customElement({ name: 'landing-page', template })
export class LandingPage {
  /**
   * A full navigation to /login is intentional: the landing page is also
   * shipped as static HTML for crawlers, where no router is running.
   */
  signIn(): void {
    window.location.assign('/login');
  }

  getStarted(): void {
    window.location.assign('/login');
  }
}
