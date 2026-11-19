import { customElement, bindable } from 'aurelia';
import { OrderItem } from '../services/enterprise-order.service';
import { FormatNumberValueConverter } from '../converters/format-number';
import template from './order-item.html';

@customElement({
  name: 'order-item-card',
  template,
  dependencies: [FormatNumberValueConverter]
})
export class OrderItemCard {
  @bindable item!: OrderItem;
  @bindable onToggle!: () => void;
  @bindable onRemove!: () => void;
}
