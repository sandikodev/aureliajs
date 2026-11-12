import {
  createProjectSchema,
  paginated,
  paginationQuerySchema,
  projectSchema,
  updateProjectSchema,
} from '@aureliajs/shared';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDb, schema } from '../db/client.js';
import { issuesFromZod, notFound } from '../lib/errors.js';
import { limitsFor } from '../lib/plan-limits.js';
import { requireRole, tenantOf } from '../middleware/tenant.js';

const toIso = (value: Date | string | null) =>
  value === null ? null : value instanceof Date ? value.toISOString() : value;

function toProject(row: typeof schema.projects.$inferSelect) {
  return projectSchema.parse({
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    status: row.status,
    budgetCents: row.budgetCents,
    dueDate: row.dueDate,
    ownerName: row.ownerName,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

const querySchema = paginationQuerySchema.extend({
  status: projectSchema.shape.status.optional(),
  sort: z.enum(['updated', 'budget', 'name']).default('updated'),
});

export const projectRoutes = new Hono();

projectRoutes.get(
  '/projects',
  zValidator('query', querySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Invalid query',
            issues: issuesFromZod(result.error),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const { workspaceId } = tenantOf(c);
    const { page, pageSize, q, status, sort } = c.req.valid('query');
    const db = getDb();

    const filters = [eq(schema.projects.workspaceId, workspaceId)];
    if (status) filters.push(eq(schema.projects.status, status));
    if (q) {
      const search = `%${q}%`;
      const match = or(
        ilike(schema.projects.name, search),
        ilike(schema.projects.ownerName, search),
      );
      if (match) filters.push(match);
    }
    const where = and(...filters);

    const orderBy =
      sort === 'budget'
        ? [desc(schema.projects.budgetCents)]
        : sort === 'name'
          ? [schema.projects.name]
          : [desc(schema.projects.updatedAt)];

    const [rows, [totalRow]] = await Promise.all([
      db
        .select()
        .from(schema.projects)
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(schema.projects).where(where),
    ]);

    return c.json(
      paginated(projectSchema).parse({
        items: rows.map(toProject),
        page,
        pageSize,
        total: Number(totalRow?.value ?? 0),
      }),
    );
  },
);

projectRoutes.post(
  '/projects',
  zValidator('json', createProjectSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Check the form',
            issues: issuesFromZod(result.error),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const tenant = tenantOf(c);
    const input = c.req.valid('json');
    const db = getDb();

    // Plan limits live in one place (lib/plan-limits.ts) so the API and the
    // UI can never disagree about how many projects a plan includes.
    const limits = limitsFor(tenant.plan);
    const [row] = await db
      .select({ value: count() })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, tenant.workspaceId));

    if (Number(row?.value ?? 0) >= limits.projects) {
      return c.json(
        {
          error: {
            code: 'plan_limit_reached',
            message: `The ${tenant.plan} plan is limited to ${limits.projects} projects. Upgrade to add more.`,
            issues: [
              {
                path: 'projects',
                message: `${limits.projects} of ${limits.projects} used`,
              },
            ],
          },
        },
        402,
      );
    }

    const [created] = await db
      .insert(schema.projects)
      .values({ ...input, workspaceId: tenant.workspaceId })
      .returning();

    await db.insert(schema.auditLogs).values({
      workspaceId: tenant.workspaceId,
      actorName: tenant.actorName,
      action: 'project.created',
      target: created!.name,
    });

    return c.json({ project: toProject(created!) }, 201);
  },
);

projectRoutes.patch(
  '/projects/:id',
  zValidator('json', updateProjectSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Check the form',
            issues: issuesFromZod(result.error),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const tenant = tenantOf(c);
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const db = getDb();

    const [updated] = await db
      .update(schema.projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(schema.projects.id, id), eq(schema.projects.workspaceId, tenant.workspaceId)))
      .returning();

    if (!updated) throw notFound('Project not found');

    await db.insert(schema.auditLogs).values({
      workspaceId: tenant.workspaceId,
      actorName: tenant.actorName,
      action: 'project.updated',
      target: updated.name,
    });

    return c.json({ project: toProject(updated) });
  },
);

projectRoutes.delete('/projects/:id', async (c) => {
  const tenant = tenantOf(c);
  requireRole(tenant, 'owner', 'admin');
  const id = c.req.param('id');
  const db = getDb();

  const [deleted] = await db
    .delete(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.workspaceId, tenant.workspaceId)))
    .returning({ name: schema.projects.name });

  if (!deleted) throw notFound('Project not found');

  await db.insert(schema.auditLogs).values({
    workspaceId: tenant.workspaceId,
    actorName: tenant.actorName,
    action: 'project.deleted',
    target: deleted.name,
  });

  return c.body(null, 204);
});
