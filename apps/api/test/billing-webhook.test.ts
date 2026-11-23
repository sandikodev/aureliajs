import { describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';

describe('Billing Webhook Edge Cases (apps/api)', () => {
  const app = createApp();

  it('rejects a missing signature with 400 before touching Stripe configuration', async () => {
    // Regression: constructing the Stripe client first turned an unauthenticated
    // malformed request into "billing not configured" (503) on a fresh clone.
    const res = await app.request('/api/billing/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('missing_signature');
  });
});
