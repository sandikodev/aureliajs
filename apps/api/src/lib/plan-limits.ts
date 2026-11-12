import { PLAN_LIMITS, type Plan } from '@aureliajs/shared';

/**
 * Single source of truth for what each plan is allowed to do.
 *
 * `PLAN_LIMITS` lives in the shared package so the API (which enforces) and
 * the web app (which renders the number next to the "Upgrade" button) can
 * never disagree. This module only adds the policy on top of it.
 */
export { PLAN_LIMITS };

export function limitsFor(plan: Plan): { projects: number; seats: number } {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/**
 * The plan a workspace is entitled to.
 *
 * Stripe is the source of truth *once a workspace has a Stripe customer*.
 * Until then the plan was set locally (seed data or an admin action) and we
 * keep it — otherwise a freshly seeded demo workspace would immediately
 * look like a free workspace while it still holds a thousand projects.
 *
 * Once Stripe is involved the subscription status decides:
 * - `active` / `trialing`  → the paid plan
 * - `past_due`              → keep access (Stripe retries the payment; we
 *                             flag the status in the UI instead of revoking)
 * - `unpaid` / `incomplete` → free (the customer never completed checkout)
 * - `canceled` / `paused`   → free
 */
export function planFromSubscription(
  subscriptionStatus: string | null,
  hasCustomer: boolean,
  fallbackPlan: Plan = 'free',
): Plan {
  if (!hasCustomer) return fallbackPlan;

  switch (subscriptionStatus) {
    case 'active':
    case 'trialing':
      return 'pro';
    case 'past_due':
      return fallbackPlan;
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'canceled':
    case 'paused':
      return 'free';
    default:
      return fallbackPlan;
  }
}
