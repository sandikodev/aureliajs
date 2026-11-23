import { describe, expect, it } from 'bun:test';
import { limitsFor, planFromSubscription } from '../src/lib/plan-limits';

describe('Plan Limits & Subscription Policy (apps/api)', () => {
  it('returns appropriate limits for free, pro, and scale plans', () => {
    const freeLimits = limitsFor('free');
    const proLimits = limitsFor('pro');
    const scaleLimits = limitsFor('scale');

    expect(freeLimits.projects).toBeGreaterThan(0);
    expect(proLimits.projects).toBeGreaterThan(freeLimits.projects);
    expect(scaleLimits.projects).toBeGreaterThan(proLimits.projects);

    expect(scaleLimits.seats).toBeGreaterThan(proLimits.seats);
    expect(proLimits.seats).toBeGreaterThan(freeLimits.seats);
  });

  it('determines plan from subscription status and preserves scale plan', () => {
    // No customer -> keeps fallback plan
    expect(planFromSubscription(null, false, 'free')).toBe('free');
    expect(planFromSubscription('active', false, 'pro')).toBe('pro');

    // Customer active -> pro for standard, scale for scale workspace
    expect(planFromSubscription('active', true, 'free')).toBe('pro');
    expect(planFromSubscription('active', true, 'pro')).toBe('pro');
    expect(planFromSubscription('active', true, 'scale')).toBe('scale');

    // Trialing preserves scale as well
    expect(planFromSubscription('trialing', true, 'scale')).toBe('scale');

    // Canceled, unpaid, or paused resets to free
    expect(planFromSubscription('canceled', true, 'pro')).toBe('free');
    expect(planFromSubscription('unpaid', true, 'scale')).toBe('free');
    expect(planFromSubscription('paused', true, 'scale')).toBe('free');

    // Past due preserves current plan while Stripe retries
    expect(planFromSubscription('past_due', true, 'scale')).toBe('scale');
    expect(planFromSubscription('past_due', true, 'pro')).toBe('pro');
  });

  it('uses one policy for every non-paying status, including incomplete flows', () => {
    for (const status of ['unpaid', 'incomplete', 'incomplete_expired', 'canceled', 'paused']) {
      expect(planFromSubscription(status, true, 'scale')).toBe('free');
      expect(planFromSubscription(status, true, 'pro')).toBe('free');
    }
  });

  it('keeps a local plan when Stripe is not involved, whatever the status', () => {
    // Seeded demo workspaces have no Stripe customer. Without this branch the
    // seed's "pro" workspace would look free on first load.
    expect(planFromSubscription(null, false, 'pro')).toBe('pro');
    expect(planFromSubscription('past_due', false, 'scale')).toBe('scale');
    expect(planFromSubscription('canceled', false, 'scale')).toBe('scale');
  });

  it('defaults an unknown status to the current entitlement rather than revoking it', () => {
    // A new Stripe status must not silently strip access before we handle it.
    expect(planFromSubscription('some_future_status', true, 'pro')).toBe('pro');
    expect(planFromSubscription(null, true, 'pro')).toBe('pro');
  });
});
