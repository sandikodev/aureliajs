import { BillingPage } from '@/pages/billing-page';
import { OverviewPage } from '@/pages/overview-page';
import { InvitePage } from '@/pages/invite-page';
import { LandingPage } from '@/pages/landing-page';
import { LoginPage } from '@/pages/login-page';
import { MembersPage } from '@/pages/members-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { ProjectsPage } from '@/pages/projects-page';
import { SettingsPage } from '@/pages/settings-page';

/**
 * Route Configuration
 * ==================
 * 
 * PRINCIPLE: URL IS THE SINGLE SOURCE OF TRUTH
 * 
 * Route metadata (data property):
 * - requiresAuth: true  → Protected route, uses AuthGuard
 * - guestOnly: true     → Guest-only route, uses GuestGuard  
 * - layout: 'auth'      → Shows sidebar + header
 * - layout: 'public'    → Minimal layout
 * 
 * Guards handle ALL routing logic automatically.
 * NO manual flags, NO race conditions.
 */

export type RouteDefinition = {
  path: string | string[];
  component: any;
  title: string;
  public?: boolean; // Backward compatibility
  noindex?: boolean; // SEO
  data?: {
    requiresAuth?: boolean; // Guard: AuthGuard
    guestOnly?: boolean;    // Guard: GuestGuard
    layout?: 'auth' | 'public'; // Layout selection
  };
};

/**
 * Public routes — accessible without authentication.
 * Guest-only routes redirect authenticated users to overview.
 */
export const PUBLIC_ROUTES: RouteDefinition[] = [
  {
    path: '',
    component: LandingPage,
    title: 'Aurelia Ops — SaaS Admin Dashboard',
    public: true,
    data: {
      guestOnly: true,
      layout: 'public'
    }
  },
  {
    path: 'login',
    component: LoginPage,
    title: 'Sign in',
    public: true,
    data: {
      guestOnly: true,
      layout: 'public'
    }
  },
  {
    path: 'invite',
    component: InvitePage,
    title: 'Accept invitation',
    public: true,
    // NOT guestOnly - user might logout to accept with different account
    data: {
      layout: 'public'
    }
  },
];

/**
 * Protected routes — require authentication.
 * AuthGuard protects these routes automatically.
 */
export const PROTECTED_ROUTES: RouteDefinition[] = [
  {
    path: 'overview',
    component: OverviewPage,
    title: 'Overview',
    noindex: true,
    data: {
      requiresAuth: true,
      layout: 'auth'
    }
  },
  {
    path: 'projects',
    component: ProjectsPage,
    title: 'Projects',
    noindex: true,
    data: {
      requiresAuth: true,
      layout: 'auth'
    }
  },
  {
    path: 'members',
    component: MembersPage,
    title: 'Members',
    noindex: true,
    data: {
      requiresAuth: true,
      layout: 'auth'
    }
  },
  {
    path: 'billing',
    component: BillingPage,
    title: 'Billing',
    noindex: true,
    data: {
      requiresAuth: true,
      layout: 'auth'
    }
  },
  {
    path: 'settings',
    component: SettingsPage,
    title: 'Settings',
    noindex: true,
    data: {
      requiresAuth: true,
      layout: 'auth'
    }
  },
];

/**
 * All application routes.
 */
export const ALL_ROUTES: RouteDefinition[] = [
  ...PUBLIC_ROUTES,
  ...PROTECTED_ROUTES,
  {
    path: 'not-found',
    component: NotFoundPage,
    title: 'Not found',
    data: {
      layout: 'public'
    }
  },
];

/**
 * Check if a component/route is publicly accessible.
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
 * Get route config for router.
 */
export function getRouterConfig() {
  return {
    routes: ALL_ROUTES.map((route) => ({
      path: route.path,
      component: route.component,
      title: route.title,
      data: route.data, // Pass metadata to guards
    })),
    fallback: 'not-found',
  };
}
