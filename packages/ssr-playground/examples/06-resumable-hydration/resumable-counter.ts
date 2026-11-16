import { customElement, bindable } from 'aurelia';

/**
 * Resumable Aurelia 2 Component
 * Renders fine-grained DOM markers with zero upfront client JavaScript bootstrap overhead.
 */
@customElement({
  name: 'resumable-counter',
  template: './resumable-counter.html'
})
export class ResumableCounter {
  @bindable title = 'Resumable Event Counter';
  @bindable description = 'Pre-rendered with W3C markers. Zero full hydration thrash, events resume on-demand.';
  @bindable count = 100;

  increment() {
    this.count++;
  }
}
