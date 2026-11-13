import { LandingPage } from '@/pages/landing-page';
import { LoginPage } from '@/pages/login-page';
import { InvitePage } from '@/pages/invite-page';
import { OverviewPage } from '@/pages/overview-page';
import { ProjectsPage } from '@/pages/projects-page';
import { MembersPage } from '@/pages/members-page';
import { BillingPage } from '@/pages/billing-page';
import { SettingsPage } from '@/pages/settings-page';
import { NotFoundPage } from '@/pages/not-found-page';

/**
 * Route definitions
 * =================
 * Single source of truth for all routes.
 *
 * PUBLIC_ROUTES — no auth required, authenticated users redirected to /overview
 * PROTECTED_ROUTES — auth required, unauthenticated users redirected to /login
 *
 * The app shell (app.ts) uses PUBLIC_ROUTE_PATHS to decide whether to show
 * the sidebar+header layout. No guards, no data metadata — just paths.
 */

export const PUBLIC_ROUTES = [
  { path: '',        component: LandingPage,  title: 'Aurelia Ops — SaaS Admin Dashboard' },
  { path: 'login',   component: LoginPage,    title: 'Sign in'                            },
  { path: 'invite',  component: InvitePage,   title: 'Accept invitation'                  },
] as const;

export const PROTECTED_ROUTES = [
  { path: 'overview', component: OverviewPage, title: 'Overview'  },
  { path: 'projects', component: ProjectsPage, title: 'Projects'  },
  { path: 'members',  component: MembersPage,  title: 'Team'      },
  { path: 'billing',  component: BillingPage,  title: 'Billing'   },
  { path: 'settings', component: SettingsPage, title: 'Settings'  },
] as const;

/**
 * Set of URL paths that belong to public routes.
 * Used by app.ts to determine shell visibility.
 * '' covers both '/' and the root path.
 */
export const PUBLIC_ROUTE_PATHS = new Set(
  PUBLIC_ROUTES.map((r) => r.path)
);

/** Full route list for the Aurelia @route decorator. */
export function getRouterConfig() {
  return {
    routes: [
      ...PUBLIC_ROUTES,
      ...PROTECTED_ROUTES,
      { path: 'not-found', component: NotFoundPage, title: 'Not found' },
    ],
    fallback: 'not-found',
  };
}
