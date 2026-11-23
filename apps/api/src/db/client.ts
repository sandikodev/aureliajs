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
