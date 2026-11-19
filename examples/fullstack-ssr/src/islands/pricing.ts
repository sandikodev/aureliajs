import { Aurelia } from 'aurelia';
import type { IslandHydrateContext } from '@aureliajs/islands/loader';
import { PricingIsland } from '../components/pricing-island.js';

export async function hydrate(ctx: IslandHydrateContext): Promise<void> {
  const instance = new PricingIsland();
  if (typeof ctx.props.plan === 'string') instance.plan = ctx.props.plan;
  if (typeof ctx.props.seats === 'number') instance.seats = ctx.props.seats;

  ctx.element.innerHTML = '';
  await new Aurelia().app({ host: ctx.element, component: instance }).start();
}
