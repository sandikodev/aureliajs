import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb, closeDb } from './client.js';

const db = getDb();

await migrate(db, { migrationsFolder: './drizzle' });
await closeDb();

console.log('✔ migrations applied');
