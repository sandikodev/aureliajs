import { customElement } from 'aurelia';
import template from './billing-page.html';
import { formatCents } from '@aureliajs/shared';

type Invoice = {
  id: string;
  date: string;
  amountCents: number;
  status: 'paid' | 'open';
};

@customElement({ name: 'billing-page', template })
export class BillingPage {
  readonly plan = 'Pro';
  readonly priceCents = 4900;
  readonly projectsUsed = 42;
  readonly projectsLimit = 100;
  readonly seatsUsed = 5;
  readonly seatsLimit = 10;
  readonly billingEmail = 'demo@aureliajs.dev';
  notice = '';

  readonly invoices: Invoice[] = [
    { id: 'INV-0042', date: '2026-11-01', amountCents: 4900, status: 'open' },
    { id: 'INV-0041', date: '2026-10-01', amountCents: 4900, status: 'paid' },
    { id: 'INV-0040', date: '2026-09-01', amountCents: 4900, status: 'paid' },
    { id: 'INV-0039', date: '2026-08-01', amountCents: 4900, status: 'paid' },
  ];

  get price(): string {
    return formatCents(this.priceCents);
  }

  get projectPercent(): number {
    return Math.round((this.projectsUsed / this.projectsLimit) * 100);
  }

  get seatPercent(): number {
    return Math.round((this.seatsUsed / this.seatsLimit) * 100);
  }

  amount(cents: number): string {
    return formatCents(cents);
  }

  announcement(): void {
    this.notice =
      'Stripe runs in test mode. Add STRIPE_SECRET_KEY and price IDs to .env, then POST /api/billing/checkout — wired in M5.';
  }
}
