import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'nested-scope',
  template: './nested-scope.html'
})
export class NestedScope {
  @bindable organization = {
    name: 'Google DeepMind Laboratory',
    tier: 'Mission Critical Alpha',
    region: 'us-central1',
    sla: '99.999%'
  };
}
