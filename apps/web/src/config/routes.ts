import { LandingPage } from '@/pages/landing-page';

/**
 * Route definitions
 * =================
 * Single source of truth for all routes.
 *
 * PUBLIC_ROUTES — no auth required. Most redirect authenticated users to /overview,
 * but /invite is intentionally accessible to authenticated users so they can accept
 * invitations without log out first.
 * PROTECTED_ROUTES — auth required, unauthenticated users redirected to /login
 *
 * The landing page is the only eager page: it is the default route used to
 * resolve `fallback`, and it is also prerendered as static HTML for `/` (which
 * does not boot the SPA at all). Every other page is a dynamic import so the
 * router fetches it only when visited.
 */

export const PUBLIC_ROUTES = [
  { path: '', component: LandingPage, title: 'Aurelia Ops — SaaS Admin Dashboard' },
  {
    path: 'login',
    component: () => import('@/pages/login-page').then((m) => m.LoginPage),
    title: 'Sign in',
  },
  {
    path: 'invite',
    component: () => import('@/pages/invite-page').then((m) => m.InvitePage),
    title: 'Accept invitation',
  },
] as const;

export const PROTECTED_ROUTES = [
  {
    path: 'overview',
    component: () => import('@/pages/overview-page').then((m) => m.OverviewPage),
    title: 'Overview',
  },
  {
    path: 'projects',
    component: () => import('@/pages/projects-page').then((m) => m.ProjectsPage),
    title: 'Projects',
  },
  {
    path: 'members',
    component: () => import('@/pages/members-page').then((m) => m.MembersPage),
    title: 'Team',
  },
  {
    path: 'billing',
    component: () => import('@/pages/billing-page').then((m) => m.BillingPage),
    title: 'Billing',
  },
  {
    path: 'settings',
    component: () => import('@/pages/settings-page').then((m) => m.SettingsPage),
    title: 'Settings',
  },
] as const;

/**
 * Set of URL paths that belong to public routes.
 * Used by app.ts to determine shell visibility.
 * '' covers both '/' and the root path.
 */
export const PUBLIC_ROUTE_PATHS = new Set<string>(PUBLIC_ROUTES.map((r) => r.path));

/**
 * Per-route description used by `app.ts` when the router settles. Crawlers
 * that do not run JavaScript only ever see the landing copy from index.html.
 */
export const ROUTE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '': 'A production-shaped SaaS admin dashboard built with Aurelia 2, TypeScript, Tailwind CSS and Hono.',
  login:
    'Sign in to Aurelia Ops, a production-shaped SaaS admin dashboard with team workspaces and billing.',
  invite: 'Accept your Aurelia Ops workspace invitation.',
  overview: 'Workspace overview: KPIs, throughput charts and recent activity.',
  projects: 'Browse, search and manage projects in your Aurelia Ops workspace.',
  members: 'Manage team members, invitations and roles in your workspace.',
  billing: 'Manage your Aurelia Ops plan, invoices and payment method.',
  settings: 'Workspace preferences and account settings.',
};

/** Full route list for the Aurelia @route decorator. */
export function getRouterConfig() {
  return {
    routes: [
      ...PUBLIC_ROUTES,
      ...PROTECTED_ROUTES,
      {
        path: 'not-found',
        component: () => import('@/pages/not-found-page').then((m) => m.NotFoundPage),
        title: 'Not found',
      },
    ],
    fallback: 'not-found',
  };
}
