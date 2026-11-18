import { formatCents, PLAN_LIMITS, type Plan } from '@aurelia-ops/shared/utils';
import type { BillingOverview } from '@aurelia-ops/shared';
import { customElement } from 'aurelia';
import template from './billing-page.html';
import { DEMO_BILLING } from '@/lib/demo-data';
import { api, ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';
import { ToastService } from '@/services/toast';
import { resolve } from 'aurelia';

type PlanTier = {
  id: Plan;
  labelKey: 'billing.planFree' | 'billing.planPro' | 'billing.planScale';
  priceKey: 'billing.priceFree' | 'billing.pricePro' | 'billing.priceScale';
  blurbKey: 'billing.planFreeBlurb' | 'billing.planProBlurb' | 'billing.planScaleBlurb';
};

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    labelKey: 'billing.planFree',
    priceKey: 'billing.priceFree',
    blurbKey: 'billing.planFreeBlurb',
  },
  {
    id: 'pro',
    labelKey: 'billing.planPro',
    priceKey: 'billing.pricePro',
    blurbKey: 'billing.planProBlurb',
  },
  {
    id: 'scale',
    labelKey: 'billing.planScale',
    priceKey: 'billing.priceScale',
    blurbKey: 'billing.planScaleBlurb',
  },
];

@customElement({ name: 'billing-page', template })
export class BillingPage {
  readonly i18n = resolve(I18nService);
  readonly toast = resolve(ToastService);
  readonly auth = resolve(AuthService);

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  overview: BillingOverview | null = null;

  isLoading = true;
  busy = false;
  demo = false;

  /** Selected interval for pricing and checkout toggle */
  selectedInterval: 'monthly' | 'yearly' = 'monthly';

  /** Set when Stripe redirects back to us after Checkout. */
  checkoutResult: 'success' | 'cancelled' | null = null;

  readonly tiers = PLAN_TIERS;
  readonly limits = PLAN_LIMITS;

  get canManage(): boolean {
    return this.auth.canManage;
  }

  selectInterval(interval: 'monthly' | 'yearly'): void {
    this.selectedInterval = interval;
  }

  async attached(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success') {
      this.checkoutResult = 'success';
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('checkout');
      cleanUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));
    } else if (checkout === 'cancelled') {
      this.checkoutResult = 'cancelled';
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('checkout');
      cleanUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      this.overview = await api.billing();
      this.demo = false;
    } catch {
      this.overview = DEMO_BILLING;
      this.demo = true;
    } finally {
      this.isLoading = false;
    }
  }

  async checkout(plan: 'pro' | 'scale', interval: 'monthly' | 'yearly'): Promise<void> {
    this.busy = true;
    try {
      const { url } = await api.startCheckout(plan, interval);
      window.location.href = url;
    } catch (cause) {
      this.busy = false;
      this.toast.error(
        cause instanceof ApiError
          ? cause.message
          : 'Could not start the checkout session. Is Stripe configured?'
      );
    }
  }

  async openPortal(): Promise<void> {
    this.busy = true;
    try {
      const { url } = await api.openPortal();
      window.location.href = url;
    } catch (cause) {
      this.busy = false;
      this.toast.error(
        cause instanceof ApiError ? cause.message : 'Could not open the billing portal.'
      );
    }
  }

  dismissResult(): void {
    this.checkoutResult = null;
  }

  /* ----------------------------------------------------------------- */
  /* Presentation helpers                                                */
  /* ----------------------------------------------------------------- */

  get plan(): Plan {
    return this.overview?.plan ?? 'free';
  }

  get planLabel(): string {
    this.i18n.track();
    const tier = PLAN_TIERS.find((t) => t.id === this.plan);
    return tier ? this.i18n.t(tier.labelKey) : this.i18n.t('billing.planFree');
  }

  get isPaid(): boolean {
    return this.plan !== 'free';
  }

  get subscriptionStatus(): string {
    return this.overview?.subscription.status ?? 'none';
  }

  get statusLabel(): string {
    this.i18n.track();
    if (!this.isPaid) {
      return this.i18n.t('billing.planFree');
    }
    const map: Record<string, string> = {
      active: 'billing.statusActive',
      trialing: 'billing.statusTrialing',
      past_due: 'billing.statusPastDue',
      unpaid: 'billing.statusUnpaid',
      incomplete: 'billing.statusIncomplete',
      canceled: 'billing.statusCanceled',
      paused: 'billing.statusPaused',
      none: 'billing.statusNone',
    };
    return this.i18n.t((map[this.subscriptionStatus] ?? 'billing.statusNone') as never);
  }

  get statusTone(): 'success' | 'warning' | 'destructive' | 'outline' {
    if (!this.isPaid) return 'outline';
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
    return this.formatDate(end);
  }

  /** "Renews 1 Nov 2026" or free plan notice */
  get renewsOnLabel(): string {
    this.i18n.track();
    const end = this.overview?.subscription.currentPeriodEnd;
    if (!this.isPaid || !end) {
      return this.i18n.t('billing.freePlanBlurb');
    }
    return this.i18n.t('billing.renewsOn', { date: this.formatDate(end) });
  }

  get isProjectsAtLimit(): boolean {
    return this.projectsPercent >= 100;
  }

  get isSeatsAtLimit(): boolean {
    return this.seatsPercent >= 100;
  }

  tierActionLabel(tier: (typeof PLAN_TIERS)[number]): string {
    this.i18n.track();
    if (tier.id === this.plan) return this.i18n.t('billing.current');
    if (this.plan === 'free') return this.i18n.t('billing.upgrade');
    if (this.plan === 'pro') {
      return tier.id === 'scale' ? this.i18n.t('billing.upgrade') : this.i18n.t('billing.downgrade');
    }
    return this.i18n.t('billing.downgrade');
  }

  canCheckoutTier(tierId: Plan): boolean {
    if (!this.canManage) return false;
    if (tierId === 'free' || tierId === this.plan) return false;
    return true;
  }

  /** "Up to 10 seats and 5 000 projects" */
  get limitsLabel(): string {
    this.i18n.track();
    if (!this.overview) return '';
    return this.i18n.t('billing.upTo', {
      seats: this.overview.limits.seats,
      projects: this.overview.limits.projects,
    });
  }

  /** "42 / 5000" */
  get projectsUsageLabel(): string {
    this.i18n.track();
    if (!this.overview) return '';
    return this.i18n.t('billing.projectsUsed', {
      used: this.overview.usage.projects,
      limit: this.overview.limits.projects,
    });
  }

  /** "4 / 10" */
  get seatsUsageLabel(): string {
    this.i18n.track();
    if (!this.overview) return '';
    return this.i18n.t('billing.seatsUsed', {
      used: this.overview.usage.seats,
      limit: this.overview.limits.seats,
    });
  }

  /** The plan tier's label, from the catalog. */
  tierLabel(tier: (typeof PLAN_TIERS)[number]): string {
    this.i18n.track();
    return this.i18n.t(tier.labelKey);
  }

  tierPrice(tier: (typeof PLAN_TIERS)[number]): string {
    this.i18n.track();
    if (tier.id === 'free') return this.i18n.t('billing.priceFree');
    if (this.selectedInterval === 'yearly') {
      return tier.id === 'pro'
        ? this.i18n.t('billing.priceProYearly')
        : this.i18n.t('billing.priceScaleYearly');
    }
    return this.i18n.t(tier.priceKey);
  }

  /**
   * The feature list for a tier.
   *
   * The numbers come from the shared `PLAN_LIMITS`, so the pricing table
   * cannot claim a limit the API does not enforce.
   */
  tierFeatures(plan: Plan): string[] {
    this.i18n.track();
    const limits = PLAN_LIMITS[plan];
    return [
      this.i18n.t('billing.featureProjects', {
        count: limits.projects.toLocaleString(this.i18n.locale),
      }),
      this.i18n.t('billing.featureSeats', { count: limits.seats }),
    ];
  }

  private formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale === 'id' ? 'id-ID' : 'en-US', {
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
    return formatCents(cents, this.i18n.locale === 'id' ? 'id-ID' : 'en-US');
  }

  invoiceDate(iso: string): string {
    return this.formatDate(iso);
  }

  invoiceStatus(status: string): 'success' | 'warning' | 'outline' {
    if (status === 'paid') return 'success';
    if (status === 'open' || status === 'uncollectible') return 'warning';
    return 'outline';
  }
}
