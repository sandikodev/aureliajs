import type { Hono } from 'hono';
import { aurelia } from '@hono/aurelia';
import { IslandsPage } from '../pages/islands.js';

/**
 * Register showcase routes for Zero-JS Selective Hydration Islands.
 * Clean, idiomatic, zero-boilerplate Aurelia 2 Single-File Component (SFC) routes.
 */
export function registerShowcaseRoutes(app: Hono<any>): void {
  // Zero-JS Selective Hydration Island Route (0 KB Aurelia above the fold, loads /island-loader.js)
  app.get(
    '/islands',
    aurelia(IslandsPage, {
      document: {
        title: 'Zero-JS Aurelia Islands',
        jsBundle: '/island-loader.js',
      },
    })
  );
}
