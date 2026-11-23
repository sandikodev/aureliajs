import Stripe from 'stripe';
import { env } from '../env';
import { HttpError, unavailable } from './errors';

/**
 * Pinned so a Stripe SDK upgrade can never silently change the API contract
 * under us. Bump deliberately, and re-run the billing e2e suite when you do.
 */
export const STRIPE_API_VERSION = '2026-10-28.endive';

let client: Stripe | null = null;

/** Override or inject Stripe client (e.g. for testing / mocking - Pillar 5). */
export function setStripe(customStripe: Stripe | null): void {
  client = customStripe;
}

/**
 * Lazily construct the Stripe client.
 *
 * The client is never created at import time: the API must boot without Stripe
 * credentials so the rest of the dashboard still works for someone who cloned
 * the repo and only wants to look at the projects CRUD. Billing routes call
 * this and get a 503 with an actionable message instead of a crash.
 */
export function getStripe(): Stripe {
  if (client) return client;

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new HttpError(
      503,
      'billing_not_configured',
      'Billing is not configured. Set STRIPE_SECRET_KEY in .env and restart the API.',
    );
  }

  client = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    // Stripe retries idempotent requests internally; 2 attempts keeps the
    // webhook handler under Stripe's 10s timeout without hiding real errors.
    maxNetworkRetries: 2,
    timeout: 20_000,
  });

  return client;
}

/** True when the API has enough configuration to talk to Stripe. */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

/**
 * The webhook signing secret is required to verify inbound events. Without it
 * we must reject the call — accepting an unverified payload would let anyone
 * grant themselves a paid plan.
 */
export function getWebhookSecret(): string {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw unavailable(
      'Stripe webhook secret is missing. Run `stripe listen --forward-to localhost:4601/api/billing/webhook` and set STRIPE_WEBHOOK_SECRET.',
    );
  }
  return secret;
}
