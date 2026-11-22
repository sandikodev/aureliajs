import { describe, expect, it } from 'bun:test';
import { limitsFor, planFromSubscription } from '../src/lib/plan-limits.js';

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
});
