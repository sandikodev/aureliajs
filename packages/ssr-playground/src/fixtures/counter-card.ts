/**
 * Sample Fixture: CounterCard
 * Demonstrates interactive two-way binding and reactive buttons
 */

import { CustomElement } from 'aurelia';

export const CounterCard: unknown = CustomElement.define(
  {
    name: 'counter-card',
    template: `
      <div class="p-6 max-w-sm mx-auto bg-card rounded-xl shadow-md border space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-foreground">\${title}</h2>
          <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-medium">SSR Hydrated</span>
        </div>
        <p class="text-sm text-muted-foreground">\${description}</p>
        <div class="flex items-center space-x-4">
          <button type="button" class="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90" click.trigger="increment()">
            Count: \${count}
          </button>
          <span class="text-xs text-muted-foreground">Double: \${count * 2}</span>
        </div>
      </div>
    `,
  },
  class {
    title = 'Interactive Counter';
    description = 'Pre-rendered on Hono server, hydrated seamlessly on client.';
    count = 42;

    increment() {
      this.count++;
    }
  }
);
