import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'order-summary',
  template: './order-summary.html'
})
export class OrderSummary {
  @bindable orderCode = 'AUR-ENTERPRISE-2026';
  @bindable tier = 'Enterprise Pro';
  @bindable subtotal = 499;
  @bindable timestamp = '2026-11-16 16:00:00 UTC';

  get formattedSubtotal() {
    return '$' + this.subtotal.toFixed(2) + ' USD';
  }
}
