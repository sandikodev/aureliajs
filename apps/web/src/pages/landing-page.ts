import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router';
import template from './landing-page.html';

/**
 * Landing page — public, unauthenticated route.
 * Hero section, feature showcase, CTA to sign in or GitHub.
 * Renders in minimal layout (no sidebar, no admin chrome).
 */
@customElement({ name: 'landing-page', template })
export class LandingPage {
  private readonly router = resolve(IRouter);

  /**
   * Navigate to login page.
   * Uses router.load() instead of href so navigation works
   * within the routed context.
   */
  signIn(): void {
    void this.router.load('login');
  }

  /**
   * Get started — same as sign in (could redirect to signup if available).
   */
  getStarted(): void {
    void this.router.load('login');
  }
}
