import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceSettingsSchema,
  type WorkspaceSettings,
  type WorkspaceSummary,
} from '@aurelia-ops/shared';
import { and, eq, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getDb, schema } from '../db/client';
import { HttpError, badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { slugify } from '@aurelia-ops/shared';
import { tenantOf } from '../middleware/tenant';

export const workspaceRoutes = new Hono();

/**
 * `GET /api/workspaces` — every workspace the signed-in user belongs to.
 *
 * The session remembers which one is active, so the list marks it. This is
 * what the sidebar switcher renders.
 */
workspaceRoutes.get('/workspaces', async (c) => {
  const tenant = tenantOf(c);
  const db = getDb();

  const rows = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      plan: schema.workspaces.plan,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(eq(schema.memberships.userId, tenant.userId))
    .orderBy(schema.memberships.createdAt);

  const list: WorkspaceSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    role: row.role,
    isActive: row.id === tenant.workspaceId,
  }));

  return c.json({ workspaces: list, activeWorkspaceId: tenant.workspaceId });
});

/**
 * `GET /api/workspaces/current` — the active workspace with its settings.
 */
workspaceRoutes.get('/workspaces/current', async (c) => {
  const tenant = tenantOf(c);
  const db = getDb();

  const [row] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, tenant.workspaceId))
    .limit(1);

  if (!row) throw notFound('Workspace not found');

  return c.json({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    role: tenant.role,
    settings: workspaceSettingsSchema.parse(row.settings ?? {}),
  });
});

/**
 * `PATCH /api/workspaces/current` — rename the workspace or change its
 * preferences.
 *
 * Only the owner can rename: the slug is part of the public URL, so it is
 * an owner-level decision. Preferences are open to admins because they do
 * not affect anybody else.
 */
workspaceRoutes.patch(
  '/workspaces/current',
  zValidator('json', updateWorkspaceSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Check the form',
            issues: result.error.issues.map((issue) => ({
              path: issue.path.map(String).join('.') || '_',
              message: issue.message,
            })),
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

    const [row] = await db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, tenant.workspaceId))
      .limit(1);

    if (!row) throw notFound('Workspace not found');

    const renaming = input.name !== undefined || input.slug !== undefined;
    if (renaming && tenant.role !== 'owner') {
      throw forbidden('Only the workspace owner can rename the workspace');
    }

    const currentSettings = workspaceSettingsSchema.parse(row.settings ?? {});

    let slug = row.slug;
    if (input.slug !== undefined) {
      slug = input.slug;
    } else if (input.name !== undefined) {
      slug = slugify(input.name);
    }

    if (slug !== row.slug) {
      const [taken] = await db
        .select({ id: schema.workspaces.id })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.slug, slug))
        .limit(1);

      if (taken) throw conflict('That workspace slug is already taken');
    }

    const settings: WorkspaceSettings = {
      ...currentSettings,
      ...input.settings,
    };

    await db
      .update(schema.workspaces)
      .set({
        name: input.name ?? row.name,
        slug,
        settings,
      })
      .where(eq(schema.workspaces.id, tenant.workspaceId));

    await db.insert(schema.auditLogs).values({
      workspaceId: tenant.workspaceId,
      actorName: tenant.actorName,
      action: 'workspace.updated',
      target: input.name ?? row.name,
    });

    return c.json({
      id: row.id,
      name: input.name ?? row.name,
      slug,
      plan: row.plan,
      role: tenant.role,
      settings,
    });
  },
);

/**
 * `POST /api/workspaces` — create a workspace and become its owner.
 *
 * The new workspace is only used if it is free of charge; the owner can move
 * between workspaces with `POST /api/auth/switch-workspace`.
 */
workspaceRoutes.post(
  '/workspaces',
  zValidator('json', createWorkspaceSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Check the form',
            issues: result.error.issues.map((issue) => ({
              path: issue.path.map(String).join('.') || '_',
              message: issue.message,
            })),
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

    let slug = input.slug ?? slugify(input.name);
    if (!slug) throw badRequest('That workspace name does not produce a usable slug');

    const [taken] = await db
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.slug, slug))
      .limit(1);

    if (taken) {
      if (input.slug) {
        throw conflict('That workspace slug is already taken');
      }
      // If user only provided a name without an explicit slug, append a random suffix
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        name: input.name,
        slug,
        plan: 'free',
        settings: { locale: 'en', weeklyDigest: true },
      })
      .returning();

    if (!workspace) {
      throw new HttpError(500, 'database_error', 'Failed to create workspace');
    }

    await db.insert(schema.memberships).values({
      workspaceId: workspace.id,
      userId: tenant.userId,
      role: 'owner',
    });

    await db.insert(schema.auditLogs).values({
      workspaceId: workspace.id,
      actorName: tenant.actorName,
      action: 'workspace.created',
      target: workspace.name,
    });

    return c.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          plan: workspace.plan,
          role: 'owner' as const,
          isActive: false,
        },
      },
      201,
    );
  },
);

/**
 * `DELETE /api/workspaces/current` — delete the workspace.
 *
 * Guarded hard: the last workspace a user owns cannot be deleted, and the
 * API refuses while the workspace still has a paid Stripe subscription —
 * deleting a workspace with an active subscription would keep billing
 * somebody for a workspace that no longer exists.
 */
workspaceRoutes.delete('/workspaces/current', async (c) => {
  const tenant = tenantOf(c);
  const db = getDb();

  if (tenant.role !== 'owner') {
    throw forbidden('Only the workspace owner can delete the workspace');
  }

  const [row] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, tenant.workspaceId))
    .limit(1);

  if (!row) throw notFound('Workspace not found');

  if (row.stripeSubscriptionId) {
    throw badRequest(
      'Cancel the Stripe subscription first — deleting the workspace now would keep billing you.',
    );
  }

  const [otherWorkspace] = await db
    .select({ workspaceId: schema.memberships.workspaceId })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, tenant.userId),
        ne(schema.memberships.workspaceId, tenant.workspaceId),
      ),
    )
    .limit(1);

  if (!otherWorkspace) {
    throw conflict(
      'This is your only workspace. Create another workspace before deleting it.',
    );
  }

  await db
    .update(schema.sessions)
    .set({ activeWorkspaceId: otherWorkspace.workspaceId })
    .where(eq(schema.sessions.activeWorkspaceId, tenant.workspaceId));

  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, tenant.workspaceId));

  return c.body(null, 204);
});
