import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'status-display',
  template: './status-display.html'
})
export class StatusDisplay {
  @bindable isOnline = true;
  @bindable statusMessage = 'All edge nodes serving Aurelia 2 SSR under 12ms latency.';

  toggle() {
    this.isOnline = !this.isOnline;
    this.statusMessage = this.isOnline
      ? 'All edge nodes serving Aurelia 2 SSR under 12ms latency.'
      : 'Failover triggered. Rerouting traffic through secondary availability zone.';
  }
}
