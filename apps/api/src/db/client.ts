import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

let sql: ReturnType<typeof postgres> | undefined;
let database: PostgresJsDatabase<typeof schema> | undefined;

/**
 * Lazy connection so the API can boot (and serve /health) even when the
 * database is not running yet. This keeps local DX friendly.
 */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!database) {
    sql = postgres(env.DATABASE_URL, { max: 10, onnotice: () => {} });
    database = drizzle(sql, { schema });
  }
  return database;
}

/** Set or override the database instance (e.g. for unit testing / mocking - Pillar 5). */
export function setDb(customDb?: PostgresJsDatabase<typeof schema>): void {
  database = customDb;
}

/**
 * The Drizzle surface used by handlers that may run inside a transaction.
 *
 * Drizzle's transaction object and the top-level database share these methods,
 * so accepting this small slice lets the same code run both ways without a
 * cast to `any` or a second implementation (Pillar 2 & 4).
 */
export type DbClient = Pick<
  PostgresJsDatabase<typeof schema>,
  'select' | 'insert' | 'update' | 'delete'
>;

export async function pingDb(): Promise<boolean> {
  try {
    const client = sql ?? postgres(env.DATABASE_URL, { max: 1, onnotice: () => {} });
    sql = client;
    await client`select 1`;
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await sql?.end({ timeout: 5 });
  sql = undefined;
  database = undefined;
}

export { schema };
