export type Role = 'owner' | 'admin' | 'member';
export type Plan = 'free' | 'pro' | 'scale';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'canceled'
  | 'paused';
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'done';
export type Locale = 'en' | 'id';

/** What each plan is allowed to do. The API enforces these, the UI renders them. */
export const PLAN_LIMITS: Record<Plan, { projects: number; seats: number }> = {
  free: { projects: 3, seats: 3 },
  pro: { projects: 5000, seats: 10 },
  scale: { projects: 50000, seats: 50 },
};

export const PROBLEM_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation: 422,
  rate_limited: 429,
} as const;

export function formatCents(cents: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
