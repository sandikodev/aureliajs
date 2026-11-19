/**
 * Sample Fixture: HelloWorld
 * Demonstrates basic SSR string interpolation and clean markup
 */

import { CustomElement } from 'aurelia';

export const HelloWorld = CustomElement.define(
  {
    name: 'hello-world',
    template: `
      <div class="p-8 max-w-lg mx-auto bg-card rounded-2xl shadow-sm border border-border text-center space-y-4">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">\${greeting}, \${name}!</h1>
        <p class="text-sm text-muted-foreground leading-relaxed">\${description}</p>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span>●</span>
          <span>Aurelia 2 Server-Side Rendered</span>
        </div>
      </div>
    `,
  },
  class {
    greeting = 'Hello';
    name = 'Sandiko';
    description = 'Compiled directly with Aurelia 2 on Hono edge runtime with zero client payload overhead.';
  }
);
