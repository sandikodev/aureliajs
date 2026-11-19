import { customElement, bindable } from 'aurelia';
import template from './counter-widget.html';

@customElement({ name: 'counter-widget', template: template as unknown as string })
export class CounterWidget {
  @bindable public count = 0;
  @bindable public step = 1;

  public increment(): void {
    this.count += Number(this.step);
  }

  public decrement(): void {
    this.count -= Number(this.step);
  }
}
