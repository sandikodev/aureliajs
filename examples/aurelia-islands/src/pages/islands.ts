import { customElement, type ICustomElementViewModel } from 'aurelia';
import template from './islands.html';

@customElement({ name: 'islands-page', template })
export class IslandsPage implements ICustomElementViewModel {
  public static readonly title = 'Zero-JS Aurelia Islands';

  public static async loader() {
    const { renderIsland } = await import('@aureliajs/islands/server');
    const { PricingIsland } = await import('../components/pricing-island');

    const pricingIslandHtml = await renderIsland({
      component: PricingIsland,
      props: { plan: 'Pro', seats: 5 },
      preserveMarkers: false,
    });
    return { pricingIslandHtml };
  }

  public pricingIslandHtml: string = '';
}
