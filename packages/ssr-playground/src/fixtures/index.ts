/**
 * Sample Fixtures Index
 */

import { CounterCard } from './counter-card.js';
import { UserProfile } from './user-profile.js';
import { DataTable } from './data-table.js';

export { CounterCard, UserProfile, DataTable };

export const FIXTURES: Record<string, unknown> = {
  'counter-card': CounterCard,
  'user-profile': UserProfile,
  'data-table': DataTable,
};
