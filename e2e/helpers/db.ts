import postgres from 'postgres';

/**
 * Direct database access for test setup and teardown.
 *
 * The e2e suite needs to put the workspace back into a known state after a
 * test that deliberately changed it (a webhook that attached a Stripe
 * customer, for example). Doing that through the API would mean inventing
 * endpoints that exist only for tests, which is worse than one small helper.
 */

const url = process.env.DATABASE_URL ?? 'postgres://aureliajs:aureliajs@localhost:5544/aureliajs';

let client: ReturnType<typeof postgres> | null = null;

function db() {
  if (!client) {
    client = postgres(url, { max: 1, onnotice: () => {} });
  }
  return client;
}

/** Detach the Stripe state a webhook may have written, restoring the demo. */
export async function resetWorkspaceBilling(workspaceId: string): Promise<void> {
  const sql = db();
  await sql`
    UPDATE workspaces
    SET stripe_customer_id = NULL,
        stripe_subscription_id = NULL,
        subscription_status = 'none',
        subscription_current_period_end = NULL,
        subscription_cancel_at_period_end = FALSE,
        plan = 'pro'
    WHERE id = ${workspaceId}
  `;
}

/** Remove ledger rows created by a test so the next run starts clean. */
export async function clearStripeEvents(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const sql = db();
  await sql`DELETE FROM stripe_events WHERE id IN ${sql(eventIds)}`;
}

/** Count audit rows for a given action, used to prove a webhook ran once. */
export async function countAuditRows(workspaceId: string, action: string): Promise<number> {
  const sql = db();
  const rows = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM audit_logs
    WHERE workspace_id = ${workspaceId} AND action = ${action}
  `;
  return rows[0]?.count ?? 0;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = null;
  }
}
