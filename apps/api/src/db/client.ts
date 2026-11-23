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
    sql = postgres(env.DATABASE_URL, connectionOptions());
    database = drizzle(sql, { schema });
  }
  return database;
}

/**
 * Neon's pooled endpoint runs PgBouncer in transaction mode, which cannot
 * reuse named prepared statements across physical connections. `prepare:
 * false` keeps postgres.js on the simple protocol; it is harmless locally, so
 * the rest of the pool is tuned only when running inside a Vercel Function.
 */
function connectionOptions(): Parameters<typeof postgres>[1] {
  const onVercel = Boolean(process.env.VERCEL);

  return {
    // A Function instance is short-lived and may be replaced at any time.
    // Keep the per-instance pool small so a traffic spike cannot exhaust Neon.
    max: onVercel ? 3 : 10,
    idle_timeout: onVercel ? 20 : undefined,
    connect_timeout: onVercel ? 10 : undefined,
    prepare: false,
    onnotice: () => {},
  };
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
    const client = sql ?? postgres(env.DATABASE_URL, { ...connectionOptions(), max: 1 });
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
