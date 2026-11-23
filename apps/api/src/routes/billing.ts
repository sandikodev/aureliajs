import { checkoutRequestSchema, type BillingOverview } from '@aurelia-ops/shared';
import { count, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import Stripe from 'stripe';
import { zValidator } from '@hono/zod-validator';
import { env, isProd } from '../env';
import { getDb, schema, type DbClient } from '../db/client';
import { badRequest, HttpError, notFound } from '../lib/errors';
import { limitsFor, planFromSubscription } from '../lib/plan-limits';
import { log } from '../lib/log';
import { getStripe, getWebhookSecret } from '../lib/stripe';
import { requireRole, tenantOf } from '../middleware/tenant';

export const billingRoutes = new Hono();

/**
 * Routes that must be reachable without a session cookie. Only the Stripe
 * webhook lives here — it authenticates with the `stripe-signature` header.
 */
export const publicBillingRoutes = new Hono();

/** Plans a customer can buy. `free` is not purchasable. */
type PaidPlan = 'pro' | 'scale';

type BillingInterval = 'monthly' | 'yearly';

/**
 * Which env var holds the Stripe Price id for a plan/interval pair.
 *
 * `scale` bills annually in practice, so both intervals resolve to the same
 * price. A missing price is a configuration gap, not a crash — the error says
 * exactly which env var to set.
 */
const PRICE_ENV: Record<`${PaidPlan}:${BillingInterval}`, string | undefined> = {
  'pro:monthly': env.STRIPE_PRICE_MONTHLY,
  'pro:yearly': env.STRIPE_PRICE_YEARLY,
  'scale:monthly': env.STRIPE_PRICE_SCALE,
  'scale:yearly': env.STRIPE_PRICE_SCALE,
};

/** The env var name that must be set for a plan/interval pair. */
const PRICE_ENV_NAME: Record<`${PaidPlan}:${BillingInterval}`, string> = {
  'pro:monthly': 'STRIPE_PRICE_MONTHLY',
  'pro:yearly': 'STRIPE_PRICE_YEARLY',
  'scale:monthly': 'STRIPE_PRICE_SCALE',
  'scale:yearly': 'STRIPE_PRICE_SCALE',
};

function resolvePriceId(plan: PaidPlan, interval: BillingInterval): string {
  const value = PRICE_ENV[`${plan}:${interval}`];
  if (!value) {
    log.error('Stripe price not configured', {
      plan,
      interval,
      envVar: PRICE_ENV_NAME[`${plan}:${interval}`],
    });
    throw badRequest(
      isProd
        ? `The ${plan} plan is not currently available for ${interval} billing.`
        : `The ${plan} plan is not available for ${interval} billing yet. Set ${PRICE_ENV_NAME[`${plan}:${interval}`]} in .env.`,
    );
  }
  return value;
}

/** The workspace row for the current tenant, including the Stripe columns. */
async function loadWorkspace(workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  if (!row) throw notFound('Workspace not found');
  return row;
}

/** Small helper so the audit trail stays consistent across billing events. */
async function dbAudit(
  db: DbClient,
  workspaceId: string,
  actorName: string,
  action: string,
  target: string,
): Promise<void> {
  await db.insert(schema.auditLogs).values({ workspaceId, actorName, action, target });
}

/**
 * `GET /api/billing` — everything the billing page needs in one round trip.
 *
 * Usage counts come from the database because they are our data; only the
 * subscription state comes from Stripe, mirrored locally by the webhook so the
 * page never blocks on an API call.
 */
billingRoutes.get('/billing', async (c) => {
  const tenant = tenantOf(c);
  const db = getDb();

  const [workspace, projectCount, seatCount] = await Promise.all([
    loadWorkspace(tenant.workspaceId),
    db
      .select({ value: count() })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, tenant.workspaceId)),
    db
      .select({ value: count() })
      .from(schema.memberships)
      .where(eq(schema.memberships.workspaceId, tenant.workspaceId)),
  ]);

  const plan = planFromSubscription(
    workspace.subscriptionStatus,
    Boolean(workspace.stripeCustomerId),
    workspace.plan,
  );
  const limits = limitsFor(plan);

  // Invoices live in Stripe; without a customer there are none to show.
  // Skip if customer ID looks like seed placeholder data.
  let invoices: BillingOverview['invoices'] = [];
  const customerId = workspace.stripeCustomerId;
  const hasRealCustomer = customerId && customerId.startsWith('cus_') && !customerId.includes('test_123');
  if (hasRealCustomer && env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      const list = await stripe.invoices.list({
        customer: customerId,
        limit: 12,
      });
      invoices = list.data.map((invoice) => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        amountCents: invoice.amount_paid || invoice.amount_due,
        status: String(invoice.status ?? 'unknown'),
        invoiceUrl: invoice.hosted_invoice_url ?? null,
      }));
    } catch (error) {
      // A Stripe outage must not take down the billing page — show the
      // subscription state we already have and an empty invoice list.
      log.error('invoice fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const payload: BillingOverview = {
    plan,
    limits,
    usage: {
      projects: Number(projectCount[0]?.value ?? 0),
      seats: Number(seatCount[0]?.value ?? 0),
    },
    subscription: {
      status: (workspace.subscriptionStatus ?? 'none') as BillingOverview['subscription']['status'],
      currentPeriodEnd: workspace.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: workspace.subscriptionCancelAtPeriodEnd,
    },
    availablePrices: {
      monthly: Boolean(env.STRIPE_PRICE_MONTHLY),
      yearly: Boolean(env.STRIPE_PRICE_YEARLY),
      scale: Boolean(env.STRIPE_PRICE_SCALE),
    },
    invoices,
  };

  return c.json(payload);
});

/**
 * `POST /api/billing/checkout` — create a Stripe Checkout Session.
 *
 * We use the hosted Stripe page (redirect) rather than Stripe.js: card data
 * never touches our server, so there is no PCI scope, and the API only has to
 * hand back a URL.
 */
billingRoutes.post(
  '/billing/checkout',
  zValidator('json', checkoutRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Check the form',
            issues: result.error.issues.map((issue) => ({
              path: issue.path.map(String).join('.') || '_',
              message: issue.message,
            })),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const tenant = tenantOf(c);
    requireRole(tenant, 'owner', 'admin');
    const { plan, interval } = c.req.valid('json');
    const priceId = resolvePriceId(plan, interval);

    const stripe = getStripe();
    const db = getDb();
    const workspace = await loadWorkspace(tenant.workspaceId);

    // Reuse the customer across checkouts so the customer portal keeps
    // working and Stripe does not create a duplicate.
    let customerId = workspace.stripeCustomerId;
    if (!customerId) {
      const [user] = await db
        .select({ email: schema.users.email, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, tenant.userId))
        .limit(1);

      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.name ?? tenant.workspaceName,
        metadata: { workspaceId: tenant.workspaceId },
      });
      customerId = customer.id;

      await db
        .update(schema.workspaces)
        .set({ stripeCustomerId: customerId })
        .where(eq(schema.workspaces.id, tenant.workspaceId));
    }

    const origin = env.WEB_ORIGIN;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // The workspace id travels with the session so the webhook can resolve
      // the right tenant even if the customer has several workspaces.
      client_reference_id: tenant.workspaceId,
      metadata: { workspaceId: tenant.workspaceId, plan },
      subscription_data: { metadata: { workspaceId: tenant.workspaceId, plan } },
      success_url: `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    await dbAudit(db, tenant.workspaceId, tenant.actorName, 'billing.checkout_started', plan);

    if (!session.url) {
      throw new HttpError(502, 'checkout_failed', 'Stripe did not return a checkout URL');
    }
    // A Checkout Session is a newly created resource; 201 matches the API
    // contract the e2e suite asserts.
    return c.json({ url: session.url }, 201);
  },
);

/**
 * `POST /api/billing/portal` — open the Stripe customer portal.
 *
 * The portal configuration (`bpc_...`) is configured in the Stripe dashboard;
 * it lets the customer change card, download invoices and cancel.
 */
billingRoutes.post('/billing/portal', async (c) => {
  const tenant = tenantOf(c);
  requireRole(tenant, 'owner', 'admin');
  const workspace = await loadWorkspace(tenant.workspaceId);

  if (!workspace.stripeCustomerId) {
    return c.json(
      {
        error: {
          code: 'billing_not_configured',
          message: 'This workspace has no billing account yet. Start a subscription first.',
        },
      },
      400,
    );
  }

  const stripe = getStripe();
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${env.WEB_ORIGIN}/billing`,
    });
    return c.json({ url: session.url });
  } catch (error: unknown) {
    // Stripe customer ID in seed data may not exist in this Stripe account.
    // Return a clear 503 instead of crashing with 500.
    const err = error as { code?: string; message?: string } | null;
    const message =
      err?.code === 'resource_missing'
        ? 'Stripe customer not found. Configure STRIPE_SECRET_KEY with the correct account or run a fresh checkout.'
        : (err?.message ?? 'Stripe portal unavailable');
    return c.json({ error: { code: 'stripe_error', message } }, 503);
  }
});

/**
 * `POST /api/billing/webhook` — Stripe event sink.
 *
 * Registered *before* the tenant middleware: Stripe does not send our session
 * cookie, so the request is authenticated by the signature instead.
 */
publicBillingRoutes.post('/billing/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json(
      { error: { code: 'missing_signature', message: 'Missing stripe-signature header' } },
      400,
    );
  }

  // Construct the client only after the request is known to be a real webhook:
  // a malformed unauthenticated call should get a 400, not "billing not set up".
  const stripe = getStripe();

  // The raw body is required — a parsed JSON object breaks the signature.
  const payload = await c.req.text();

  // Resolve configuration outside the try: a missing secret is a deployment
  // problem (503 + setup instructions), not a forged signature (400).
  const webhookSecret = getWebhookSecret();

  let event: Stripe.Event;
  try {
    // Stripe's WebCrypto provider cannot verify a signature synchronously on
    // Bun/Edge runtimes. The sync API throws "SubtleCryptoProvider cannot be
    // used in a synchronous context", which used to surface as a permanent
    // 400 for *every* webhook — paid plans were never activated.
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    log.error('webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // 4xx: Stripe will not retry a request we reject as malformed.
    return c.json(
      { error: { code: 'invalid_signature', message: 'Signature verification failed' } },
      400,
    );
  }

  const db = getDb();

  try {
    /*
     * Claim + side effects share one transaction. The event id is the primary
     * key: a second delivery finds no inserted row and is acknowledged without
     * re-applying anything. If applyEvent throws, the ledger row is rolled back
     * with it. The previous version deleted the row on failure, which could
     * leave a partially applied event (audit written, plan not updated) and let
     * a concurrent retry see a "duplicate" for work that never finished.
     */
    const outcome = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(schema.stripeEvents)
        .values({ id: event.id, type: event.type })
        .onConflictDoNothing()
        .returning({ id: schema.stripeEvents.id });

      if (inserted.length === 0) return { duplicate: true };

      await applyEvent(event, tx);
      return { duplicate: false };
    });

    return c.json({ received: true, ...outcome });
  } catch (error) {
    log.error('failed to handle stripe event', {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
    // 5xx: the transaction rolled back, so Stripe's retry starts clean.
    return c.json({ error: { code: 'handler_failed', message: 'Could not process event' } }, 500);
  }
});

/**
 * Apply a Stripe event to our local state.
 *
 * Kept separate from the HTTP handler so it can be exercised directly in a
 * test without going through signature verification.
 */
async function applyEvent(event: Stripe.Event, db: DbClient): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id;
      if (!workspaceId) return;

      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      await db
        .update(schema.workspaces)
        .set({
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId ?? null,
          subscriptionStatus: 'active',
          plan: session.metadata?.plan === 'scale' ? 'scale' : 'pro',
        })
        .where(eq(schema.workspaces.id, workspaceId));

      await db
        .update(schema.stripeEvents)
        .set({ workspaceId })
        .where(eq(schema.stripeEvents.id, event.id));

      await dbAudit(
        db,
        workspaceId,
        'Stripe',
        'billing.plan_activated',
        session.metadata?.plan ?? 'pro',
      );
      return;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspaceId;
      if (!workspaceId) return;

      const status = subscription.status;
      // Since API 2025-03-31 the period end lives on the subscription item.
      const periodEnd = subscription.items.data[0]?.current_period_end;
      const subscribedPlan = subscription.metadata?.plan === 'scale' ? 'scale' : 'pro';
      /*
       * `plan` is the entitlement, not a copy of the Stripe status. Using the
       * same policy here that the tenant middleware and billing page use is
       * what keeps `past_due` from silently downgrading a paying workspace
       * while Stripe is still retrying the card.
       */
      const plan = planFromSubscription(status, true, subscribedPlan);

      await db
        .update(schema.workspaces)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan,
        })
        .where(eq(schema.workspaces.id, workspaceId));

      await db
        .update(schema.stripeEvents)
        .set({ workspaceId })
        .where(eq(schema.stripeEvents.id, event.id));

      await dbAudit(
        db,
        workspaceId,
        'Stripe',
        status === 'active' || status === 'trialing'
          ? 'billing.plan_activated'
          : status === 'past_due'
            ? 'billing.payment_past_due'
            : 'billing.plan_changed',
        `${subscribedPlan} · ${status}`,
      );
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Since API 2025-03-31 the subscription reference lives under `parent`.
      const workspaceId =
        invoice.metadata?.workspaceId ??
        invoice.parent?.subscription_details?.metadata?.workspaceId;
      if (!workspaceId) return;

      await db
        .update(schema.stripeEvents)
        .set({ workspaceId })
        .where(eq(schema.stripeEvents.id, event.id));

      await dbAudit(
        db,
        workspaceId,
        'Stripe',
        event.type === 'invoice.paid' ? 'billing.invoice_paid' : 'billing.invoice_failed',
        invoice.number ?? invoice.id,
      );
      return;
    }

    default:
      // Unhandled event types are still recorded, so we can see what Stripe
      // actually sends and extend the switch deliberately.
      return;
  }
}
