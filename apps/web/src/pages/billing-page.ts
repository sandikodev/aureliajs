import { formatCents, PLAN_LIMITS, type BillingOverview, type Plan } from '@aureliajs/shared';
import { customElement } from 'aurelia';
import template from './billing-page.html';
import { api, ApiError } from '@/services/api';

type PlanTier = {
  id: Plan;
  label: string;
  priceLabel: string;
  blurb: string;
  features: string[];
};

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    label: 'Free',
    priceLabel: '$0',
    blurb: 'For trying the dashboard with a small team.',
    features: ['3 projects', '3 seats', 'Community support'],
  },
  {
    id: 'pro',
    label: 'Pro',
    priceLabel: '$49/mo',
    blurb: 'For a studio running delivery on a daily basis.',
    features: ['5 000 projects', '10 seats', 'Stripe billing', 'Audit trail'],
  },
  {
    id: 'scale',
    label: 'Scale',
    priceLabel: '$499/mo',
    blurb: 'For teams that need room to grow.',
    features: ['50 000 projects', '50 seats', 'Everything in Pro', 'Priority support'],
  },
];

@customElement({ name: 'billing-page', template })
export class BillingPage {
  overview: BillingOverview | null = null;

  isLoading = true;
  busy = false;
  error = '';
  notice = '';
  demo = false;

  /** Set when Stripe redirects back to us after Checkout. */
  checkoutResult: 'success' | 'cancelled' | null = null;

  readonly tiers = PLAN_TIERS;
  readonly limits = PLAN_LIMITS;

  async attached(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success' || checkout === 'cancelled') {
      this.checkoutResult = checkout;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.error = '';
    try {
      this.overview = await api.billing();
      this.demo = false;
      if (this.checkoutResult === 'success') {
        this.notice = 'Payment received. Your plan is active — Stripe confirmed it via webhook.';
      }
    } catch (cause) {
      this.error =
        cause instanceof ApiError ? cause.message : 'Could not load billing information.';
      this.overview = null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Start a Stripe Checkout session and follow the redirect.
   *
   * The card form lives on Stripe's hosted page, so nothing about the payment
   * touches this app — we only ever receive a URL.
   */
  async checkout(plan: 'pro' | 'scale', interval: 'monthly' | 'yearly'): Promise<void> {
    this.error = '';
    this.notice = '';
    this.busy = true;
    try {
      const { url } = await api.startCheckout(plan, interval);
      window.location.href = url;
    } catch (cause) {
      this.busy = false;
      this.error =
        cause instanceof ApiError
          ? cause.message
          : 'Could not start the checkout session. Is Stripe configured?';
    }
  }

  /** Open the Stripe customer portal so the customer can manage the subscription. */
  async openPortal(): Promise<void> {
    this.error = '';
    this.notice = '';
    this.busy = true;
    try {
      const { url } = await api.openPortal();
      window.location.href = url;
    } catch (cause) {
      this.busy = false;
      this.error = cause instanceof ApiError ? cause.message : 'Could not open the billing portal.';
    }
  }

  dismissResult(): void {
    this.checkoutResult = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.toString());
  }

  /* ----------------------------------------------------------------- */
  /* Presentation helpers                                                */
  /* ----------------------------------------------------------------- */

  get plan(): Plan {
    return this.overview?.plan ?? 'free';
  }

  get planLabel(): string {
    return PLAN_TIERS.find((tier) => tier.id === this.plan)?.label ?? 'Free';
  }

  get isPaid(): boolean {
    return this.plan !== 'free';
  }

  get subscriptionStatus(): string {
    return this.overview?.subscription.status ?? 'none';
  }

  get statusLabel(): string {
    switch (this.subscriptionStatus) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trialing';
      case 'past_due':
        return 'Past due';
      case 'unpaid':
        return 'Unpaid';
      case 'incomplete':
        return 'Incomplete';
      case 'canceled':
        return 'Canceled';
      case 'paused':
        return 'Paused';
      default:
        return 'No subscription';
    }
  }

  get statusTone(): 'success' | 'warning' | 'destructive' | 'outline' {
    switch (this.subscriptionStatus) {
      case 'active':
      case 'trialing':
        return 'success';
      case 'past_due':
      case 'unpaid':
        return 'destructive';
      case 'incomplete':
        return 'warning';
      default:
        return 'outline';
    }
  }

  get renewsOn(): string {
    const end = this.overview?.subscription.currentPeriodEnd;
    if (!end) return '';
    return new Date(end).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  get projectsPercent(): number {
    if (!this.overview) return 0;
    const { projects } = this.overview.usage;
    return Math.min(100, Math.round((projects / Math.max(1, this.overview.limits.projects)) * 100));
  }

  get seatsPercent(): number {
    if (!this.overview) return 0;
    const { seats } = this.overview.usage;
    return Math.min(100, Math.round((seats / Math.max(1, this.overview.limits.seats)) * 100));
  }

  get canBuyMonthly(): boolean {
    return Boolean(this.overview?.availablePrices.monthly);
  }

  get canBuyYearly(): boolean {
    return Boolean(this.overview?.availablePrices.yearly);
  }

  get canBuyScale(): boolean {
    return Boolean(this.overview?.availablePrices.scale);
  }

  amount(cents: number): string {
    return formatCents(cents);
  }

  invoiceDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  invoiceStatus(status: string): 'success' | 'warning' | 'outline' {
    if (status === 'paid') return 'success';
    if (status === 'open' || status === 'uncollectible') return 'warning';
    return 'outline';
  }
}
