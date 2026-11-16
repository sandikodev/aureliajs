import { customElement, bindable } from 'aurelia';

export interface TelemetryRow {
  name: string;
  value: string;
  status: string;
}

@customElement({
  name: 'data-table',
  template: './data-table.html'
})
export class DataTable {
  @bindable title = 'Realtime System Telemetry';
  @bindable rows: TelemetryRow[] = [
    { name: 'Memory Heap', value: '42.8 MB', status: 'Optimal' },
    { name: 'SSR Latency', value: '0.8 ms', status: 'Fast' },
    { name: 'Hydration Markers', value: '9 Paired', status: 'Healthy' }
  ];
}
