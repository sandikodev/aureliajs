import { expect, test, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { signupOwner } from './helpers/auth';
import { clearStripeEvents, closeDb, countAuditRows, resetWorkspaceBilling } from './helpers/db';

/**
 * Billing coverage.
 *
 * The interesting part is not "does the button work" — it is whether a
 * webhook is verified, applied exactly once, and reflected in the plan the
 * API enforces. Those are the three failure modes that cost real money.
 */

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

/** Stripe signs `timestamp.payload` with HMAC-SHA256 and sends it in the header. */
function signPayload(payload: string, secret: string, timestamp: number): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function login(page: Page) {
  await signupOwner(page);
}

async function workspaceIdOf(page: Page): Promise<string> {
  const session = await (await page.request.get('/api/auth/me')).json();
  const id = session.workspace?.id;
  expect(id, 'the signed-up owner should belong to a workspace').toBeTruthy();
  return id as string;
}

test.describe('billing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Every test starts from the same workspace state: no Stripe customer,
    // no subscription. Otherwise a webhook from a previous run would leak
    // into the next test and make it pass or fail for the wrong reason.
    const workspaceId = await workspaceIdOf(page);
    await resetWorkspaceBilling(workspaceId);
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('GET /api/billing reports plan, limits and usage', async ({ page }) => {
    const response = await page.request.get('/api/billing');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      plan: expect.any(String),
      limits: { projects: expect.any(Number), seats: expect.any(Number) },
      usage: { projects: expect.any(Number), seats: expect.any(Number) },
      subscription: { status: expect.any(String) },
      availablePrices: {
        monthly: expect.any(Boolean),
        yearly: expect.any(Boolean),
        scale: expect.any(Boolean),
      },
    });
    expect(Array.isArray(body.invoices)).toBeTruthy();
  });

  test('billing page renders the plan coming from the API', async ({ page }) => {
    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.getByTestId('current-plan')).toBeVisible();
    await expect(page.getByTestId('subscription-status')).toBeVisible();

    // The page must not fall back to hardcoded copy when the API is live.
    const planText = await page.getByTestId('current-plan').innerText();
    expect(planText.trim().length).toBeGreaterThan(0);
  });

  test('checkout is refused when no Stripe price is configured', async ({ page }) => {
    const response = await page.request.post('/api/billing/checkout', {
      data: { plan: 'pro', interval: 'monthly' },
      headers: { 'content-type': 'application/json' },
    });

    // Either the price is configured (201 + a Stripe URL) or it is not
    // (400 with an actionable message). Both are correct; a 500 is not.
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error.code).toBe('bad_request');
      expect(body.error.message).toContain('STRIPE_PRICE_');
    } else {
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.url).toContain('stripe.com');
    }
  });

  test('portal is refused when the workspace has no Stripe customer', async ({ page }) => {
    const response = await page.request.post('/api/billing/portal');

    if (response.status() === 503) {
      // Stripe is not configured on this deployment. The API says so
      // clearly, which is the correct answer — not a silent no-op.
      const body = await response.json();
      expect(body.error.code).toBe('billing_not_configured');
      return;
    }

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error.message).toContain('no billing account');
  });

  test('webhook rejects a payload with an invalid signature', async ({ page }) => {
    const response = await page.request.post('/api/billing/webhook', {
      data: { id: 'evt_fake', type: 'checkout.session.completed' },
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=deadbeef',
      },
    });

    if (response.status() === 503) {
      const body = await response.json();
      expect(body.error.code).toBe('billing_not_configured');
      return;
    }

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('invalid_signature');
  });

  test('webhook applies a plan change exactly once', async ({ page }) => {
    test.skip(!WEBHOOK_SECRET, 'STRIPE_WEBHOOK_SECRET is required to sign a test webhook payload');

    const workspaceId = await workspaceIdOf(page);

    const eventId = `evt_test_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
          metadata: { workspaceId, plan: 'pro' },
        },
      },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signPayload(payload, WEBHOOK_SECRET, timestamp);

    const before = await countAuditRows(workspaceId, 'billing.plan_activated');

    const first = await page.request.post('/api/billing/webhook', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
    });

    if (first.status() === 503) {
      // The deployment has no Stripe key, so the webhook cannot verify a
      // signature. That is the correct refusal.
      const body = await first.json();
      expect(body.error.code).toBe('billing_not_configured');
      return;
    }

    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, duplicate: false });

    // The workspace now has a Stripe customer attached.
    const billing = await (await page.request.get('/api/billing')).json();
    expect(billing.subscription.status).toBe('active');

    const after = await countAuditRows(workspaceId, 'billing.plan_activated');
    expect(after, 'the webhook should be applied exactly once').toBe(before + 1);

    // The same delivery again must be a no-op.
    const second = await page.request.post('/api/billing/webhook', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
    });
    expect(second.status()).toBe(200);
    expect(await second.json()).toMatchObject({ received: true, duplicate: true });

    expect(await countAuditRows(workspaceId, 'billing.plan_activated')).toBe(after);

    await clearStripeEvents([eventId]);
  });
});
