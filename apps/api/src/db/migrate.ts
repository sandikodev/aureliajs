import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb, closeDb } from './client';

/**
 * Resolve the migrations folder relative to this module rather than the
 * working directory, so the same file works from `src/` in development and
 * from `dist/` inside the container.
 */
const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;

const db = getDb();

await migrate(db, { migrationsFolder });
await closeDb();

console.log('✔ migrations applied');
