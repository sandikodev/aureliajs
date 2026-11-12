import { Hono } from 'hono';
import { and, count, desc, eq, isNotNull, lt, sql, sum } from 'drizzle-orm';
import { getDb, schema } from '../db/client.js';
import { tenantOf } from '../middleware/tenant.js';

export const overviewRoutes = new Hono();

overviewRoutes.get('/overview', async (c) => {
  const { workspaceId } = tenantOf(c);
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const scope = eq(schema.projects.workspaceId, workspaceId);

  const [byStatus, budgetRow, overdueRow, memberRow, recent] = await Promise.all([
    db
      .select({ status: schema.projects.status, value: count() })
      .from(schema.projects)
      .where(scope)
      .groupBy(schema.projects.status),
    db
      .select({ value: sum(schema.projects.budgetCents) })
      .from(schema.projects)
      .where(and(scope, isNotNull(schema.projects.budgetCents))),
    db
      .select({ value: count() })
      .from(schema.projects)
      .where(
        and(
          scope,
          isNotNull(schema.projects.dueDate),
          lt(schema.projects.dueDate, today),
          sql`${schema.projects.status} <> 'done'`,
        ),
      ),
    db
      .select({ value: count() })
      .from(schema.memberships)
      .where(eq(schema.memberships.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.workspaceId, workspaceId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(8),
  ]);

  const statuses = Object.fromEntries(
    byStatus.map((row) => [row.status, Number(row.value)]),
  ) as Record<string, number>;

  return c.json({
    stats: {
      total: Object.values(statuses).reduce((a, b) => a + b, 0),
      active: statuses.active ?? 0,
      planning: statuses.planning ?? 0,
      paused: statuses.paused ?? 0,
      done: statuses.done ?? 0,
      overdue: Number(overdueRow[0]?.value ?? 0),
      members: Number(memberRow[0]?.value ?? 0),
      budgetCents: Number(budgetRow[0]?.value ?? 0),
    },
    activity: recent.map((row) => ({
      id: row.id,
      actorName: row.actorName,
      action: row.action,
      target: row.target,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});
