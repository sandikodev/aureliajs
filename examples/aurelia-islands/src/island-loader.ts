import { observeIslands } from '@aureliajs/islands/loader';

// ~1.3 KB gzipped, zero eager Aurelia runtime.
// Observes [data-au-island] elements and imports their chunk only when triggered.
observeIslands();
