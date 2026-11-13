import { BillingPage } from '@/pages/billing-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { InvitePage } from '@/pages/invite-page';
import { LandingPage } from '@/pages/landing-page';
import { LoginPage } from '@/pages/login-page';
import { MembersPage } from '@/pages/members-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { ProjectsPage } from '@/pages/projects-page';
import { SettingsPage } from '@/pages/settings-page';

/**
 * Route metadata. Separates public/protected routes to enable:
 * 1. Metadata-based guards (not URL-based)
 * 2. Clear auth intent
 * 3. Fallback routing logic
 */

export type RouteDefinition = {
  path: string | string[];
  component: any;
  title: string;
  public?: boolean; // If true, accessible without auth
  noindex?: boolean; // If true, add noindex meta tag (for protected routes)
};

/**
 * Public routes — accessible without authentication.
 * Renders in minimal layout (no sidebar, no admin chrome).
 */
export const PUBLIC_ROUTES: RouteDefinition[] = [
  {
    path: '',
    component: LandingPage,
    title: 'Aurelia Ops — SaaS Admin Dashboard',
    public: true,
  },
  {
    path: 'login',
    component: LoginPage,
    title: 'Sign in',
    public: true,
  },
  {
    path: 'invite',
    component: InvitePage,
    title: 'Accept invitation',
    public: true,
  },
];

/**
 * Protected routes — require authentication.
 * Renders in full layout with sidebar, header, admin chrome.
 * All marked noindex for SEO (private app content).
 */
export const PROTECTED_ROUTES: RouteDefinition[] = [
  {
    path: 'dashboard',
    component: DashboardPage,
    title: 'Dashboard',
    noindex: true,
  },
  {
    path: 'projects',
    component: ProjectsPage,
    title: 'Projects',
    noindex: true,
  },
  {
    path: 'members',
    component: MembersPage,
    title: 'Members',
    noindex: true,
  },
  {
    path: 'billing',
    component: BillingPage,
    title: 'Billing',
    noindex: true,
  },
  {
    path: 'settings',
    component: SettingsPage,
    title: 'Settings',
    noindex: true,
  },
];

/**
 * All application routes.
 * Order matters: exact matches first, then fallback.
 */
export const ALL_ROUTES: RouteDefinition[] = [
  ...PUBLIC_ROUTES,
  ...PROTECTED_ROUTES,
  {
    path: 'not-found',
    component: NotFoundPage,
    title: 'Not found',
  },
];

/**
 * Check if a component/route is publicly accessible.
 * Uses route metadata, not URL pathname.
 */
export function isPublicRoute(component: any): boolean {
  return PUBLIC_ROUTES.some((route) => route.component === component);
}

/**
 * Check if a component/route requires authentication.
 */
export function isProtectedRoute(component: any): boolean {
  return PROTECTED_ROUTES.some((route) => route.component === component);
}

/**
 * Get route config for the router decorator.
 * Strips metadata, returns Aurelia-compatible format.
 */
export function getRouterConfig() {
  return {
    routes: ALL_ROUTES.map((route) => ({
      path: route.path,
      component: route.component,
      title: route.title,
    })),
    fallback: 'not-found',
  };
}
