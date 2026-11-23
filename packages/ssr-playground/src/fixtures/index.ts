/**
 * Sample Fixtures Index
 */

import type { AureliaComponent } from '@aureliajs/ssr';
import { CounterCard } from './counter-card';
import { UserProfile } from './user-profile';
import { DataTable } from './data-table';
import { HelloWorld } from './hello-world';

export { HelloWorld, CounterCard, UserProfile, DataTable };

export const FIXTURES: Record<string, AureliaComponent> = {
  'hello-world': HelloWorld,
  'counter-card': CounterCard,
  'user-profile': UserProfile,
  'data-table': DataTable,
};
