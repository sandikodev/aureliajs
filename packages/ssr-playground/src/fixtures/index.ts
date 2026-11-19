/**
 * Sample Fixtures Index
 */

import type { AureliaComponent } from '@aureliajs/ssr';
import { CounterCard } from './counter-card.js';
import { UserProfile } from './user-profile.js';
import { DataTable } from './data-table.js';
import { HelloWorld } from './hello-world.js';

export { HelloWorld, CounterCard, UserProfile, DataTable };

export const FIXTURES: Record<string, AureliaComponent> = {
  'hello-world': HelloWorld,
  'counter-card': CounterCard,
  'user-profile': UserProfile,
  'data-table': DataTable,
};
