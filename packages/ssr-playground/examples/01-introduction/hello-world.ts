import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'hello-world',
  template: './hello-world.html'
})
export class HelloWorld {
  @bindable greeting = 'Hello';
  @bindable name = 'Sandiko';
  @bindable description = 'Compiled directly with Aurelia 2 on Hono edge runtime with zero client payload overhead.';
}
