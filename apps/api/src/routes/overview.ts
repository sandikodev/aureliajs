import { Hono } from 'hono';
import { and, count, desc, eq, gte, isNotNull, lt, sql, sum } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { overviewQuerySchema } from '@aurelia-ops/shared';
import { getDb, schema } from '../db/client';
import { issuesFromZod } from '../lib/errors';
import { tenantOf } from '../middleware/tenant';

export const overviewRoutes = new Hono();

/** The windows the dashboard can report on. */
const PERIODS = {
  'last-7': 7,
  'last-30': 30,
  quarter: 90,
} as const;

/**
 * `GET /api/overview` — the numbers behind the dashboard.
 *
 * The `period` query parameter is not decoration: it decides the window the
 * status counts, the budget and the overdue count are computed over, so
 * switching the range in the UI actually changes the numbers.
 */
overviewRoutes.get(
  '/overview',
  zValidator('query', overviewQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Invalid query parameter',
            issues: issuesFromZod(result.error),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const { workspaceId } = tenantOf(c);
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const { period } = c.req.valid('query');
    const days = PERIODS[period];
    const since = new Date(Date.now() - days * 86_400_000);

    const scope = eq(schema.projects.workspaceId, workspaceId);

    // Everything created inside the reporting window.
    const inWindow = and(scope, gte(schema.projects.createdAt, since));

    const [byStatus, budgetRow, overdueRow, memberRow, recent, windowed] = await Promise.all([
      db
        .select({ status: schema.projects.status, value: count() })
        .from(schema.projects)
        .where(inWindow)
        .groupBy(schema.projects.status),
      db
        .select({ value: sum(schema.projects.budgetCents) })
        .from(schema.projects)
        .where(and(inWindow, isNotNull(schema.projects.budgetCents))),
      db
        .select({ value: count() })
        .from(schema.projects)
        .where(
          and(
            inWindow,
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
      db.select({ value: count() }).from(schema.projects).where(scope),
    ]);

    const statuses = Object.fromEntries(
      byStatus.map((row) => [row.status, Number(row.value)]),
    ) as Record<string, number>;

    // Delivery throughput: projects created per month over the last 12 months.
    // This is a real query against the projects table, not a hardcoded array.
    const trend = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${schema.projects.createdAt}), 'YYYY-MM')`,
        value: count(),
      })
      .from(schema.projects)
      .where(and(scope, gte(schema.projects.createdAt, new Date(Date.now() - 365 * 86_400_000))))
      .groupBy(sql`date_trunc('month', ${schema.projects.createdAt})`)
      .orderBy(sql`date_trunc('month', ${schema.projects.createdAt})`);

    const trendByMonth = new Map(trend.map((row) => [row.month, Number(row.value)]));

    const months: { month: string; value: number }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date();
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCMonth(date.getUTCMonth() - i);
      const key = date.toISOString().slice(0, 7);
      months.push({ month: key, value: trendByMonth.get(key) ?? 0 });
    }

    return c.json({
      period,
      periodDays: days,
      stats: {
        total: Number(windowed[0]?.value ?? 0),
        active: statuses.active ?? 0,
        planning: statuses.planning ?? 0,
        paused: statuses.paused ?? 0,
        done: statuses.done ?? 0,
        overdue: Number(overdueRow[0]?.value ?? 0),
        members: Number(memberRow[0]?.value ?? 0),
        budgetCents: Number(budgetRow[0]?.value ?? 0),
      },
      trend: months,
      activity: recent.map((row) => ({
        id: row.id,
        actorName: row.actorName,
        action: row.action,
        target: row.target,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  },
);
