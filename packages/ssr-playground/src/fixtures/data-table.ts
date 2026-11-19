/**
 * Sample Fixture: DataTable
 * Demonstrates complex template controllers (repeat.for, if.bind) and hydration markers
 */

import { CustomElement } from 'aurelia';

export const DataTable = CustomElement.define(
  {
    name: 'data-table',
    template: `
      <div class="border rounded-lg overflow-hidden shadow-sm bg-card">
        <div class="px-4 py-3 bg-muted/40 border-b flex justify-between items-center">
          <h3 class="font-semibold text-sm">\${tableName}</h3>
          <span class="text-xs text-muted-foreground">\${items.length} items rendered</span>
        </div>
        <table class="w-full text-sm text-left">
          <thead class="bg-muted/20 text-xs uppercase text-muted-foreground border-b">
            <tr>
              <th class="px-4 py-2">ID</th>
              <th class="px-4 py-2">Service</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2 text-right">Latency</th>
            </tr>
          </thead>
          <tbody>
            <tr repeat.for="row of items" class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-2.5 font-mono text-xs">#\${row.id}</td>
              <td class="px-4 py-2.5 font-medium">\${row.service}</td>
              <td class="px-4 py-2.5">
                <span if.bind="row.status === 'HEALTHY'" class="px-2 py-0.5 text-[11px] rounded bg-emerald-100 text-emerald-800 font-semibold">HEALTHY</span>
                <span if.bind="row.status !== 'HEALTHY'" class="px-2 py-0.5 text-[11px] rounded bg-amber-100 text-amber-800 font-semibold">DEGRADED</span>
              </td>
              <td class="px-4 py-2.5 text-right font-mono text-xs">\${row.latency}ms</td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  },
  class {
    tableName = 'Microservice Telemetry';
    items = [
      { id: '101', service: 'Hono SSR Gateway', status: 'HEALTHY', latency: 4 },
      { id: '102', service: 'Aurelia 2 Hydration Engine', status: 'HEALTHY', latency: 8 },
      { id: '103', service: 'PostgreSQL Connection Pool', status: 'HEALTHY', latency: 12 },
      { id: '104', service: 'Edge CDN Cache', status: 'HEALTHY', latency: 2 },
    ];
  }
);
