import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'counter-card',
  template: './counter-card.html'
})
export class CounterCard {
  @bindable title = 'Interactive Counter';
  @bindable description = 'Pre-rendered on Hono server, hydrated seamlessly on client.';
  @bindable count = 42;

  increment() {
    this.count++;
  }
}
