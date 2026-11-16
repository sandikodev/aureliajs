/**
 * Sample Fixtures Index
 */

import { CounterCard } from './counter-card.js';
import { UserProfile } from './user-profile.js';
import { DataTable } from './data-table.js';
import { HelloWorld } from './hello-world.js';

export { HelloWorld, CounterCard, UserProfile, DataTable };

export const FIXTURES: Record<string, unknown> = {
  'hello-world': HelloWorld,
  'counter-card': CounterCard,
  'user-profile': UserProfile,
  'data-table': DataTable,
};
