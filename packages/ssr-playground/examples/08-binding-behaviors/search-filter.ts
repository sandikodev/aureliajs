import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'search-filter',
  template: './search-filter.html'
})
export class SearchFilter {
  @bindable query = 'aurelia-ssr';
  @bindable matchCount = 8;

  queryChanged(newVal: string) {
    this.matchCount = newVal ? Math.max(1, 12 - newVal.length) : 8;
  }
}
