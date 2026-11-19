import { customElement, bindable } from 'aurelia';
import template from './pricing-island.html';

@customElement({ name: 'pricing-island', template })
export class PricingIsland {
  public static readonly island = { trigger: 'visible', rootMargin: '200px' } as const;

  @bindable public plan: string = 'Pro';
  @bindable public seats: number = 5;

  public addSeat(): void {
    this.seats++;
  }
}
