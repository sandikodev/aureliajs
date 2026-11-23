import { Hono } from 'hono';
import { and, count, eq, isNull } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { updateMemberRoleSchema } from '@aurelia-ops/shared';
import { getDb, schema } from '../db/client';
import { badRequest, conflict, forbidden, issuesFromZod, notFound } from '../lib/errors';
import { limitsFor } from '../lib/plan-limits';
import { requireRole, tenantOf } from '../middleware/tenant';

export const memberRoutes = new Hono();

/**
 * `GET /api/members` — the people in this workspace, with their role.
 */
memberRoutes.get('/members', async (c) => {
  const tenant = tenantOf(c);
  const db = getDb();

  const rows = await db
    .select({
      userId: schema.memberships.userId,
      role: schema.memberships.role,
      name: schema.users.name,
      email: schema.users.email,
      avatarUrl: schema.users.avatarUrl,
      createdAt: schema.users.createdAt,
      joinedAt: schema.memberships.createdAt,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.workspaceId, tenant.workspaceId));

  const seatLimit = limitsFor(tenant.plan).seats;

  // An open invitation already reserves a seat, so it counts towards the
  // usage. Showing "4 of 10" while six invitations are outstanding would
  // make the limit look further away than it is.
  const [pendingRow] = await db
    .select({ value: count() })
    .from(schema.invites)
    .where(
      and(eq(schema.invites.workspaceId, tenant.workspaceId), isNull(schema.invites.acceptedAt)),
    );

  return c.json({
    members: rows.map((row) => ({
      id: row.userId,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      role: row.role,
      status: 'active',
      joinedAt: row.joinedAt.toISOString(),
    })),
    seatLimit,
    seatUsed: rows.length + Number(pendingRow?.value ?? 0),
    memberCount: rows.length,
    pendingInvites: Number(pendingRow?.value ?? 0),
  });
});

/**
 * `PATCH /api/members/:userId` — change somebody's role.
 *
 * Owner only. Admins can remove members but cannot promote anyone to admin:
 * handing out admin rights is an owner decision.
 */
memberRoutes.patch(
  '/members/:userId',
  zValidator('json', updateMemberRoleSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Role must be one of owner, admin or member',
            issues: issuesFromZod(result.error),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const tenant = tenantOf(c);
    requireRole(tenant, 'owner');

    const { role } = c.req.valid('json');
    const db = getDb();
    const targetId = c.req.param('userId');

    const [membership] = await db
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.workspaceId, tenant.workspaceId),
          eq(schema.memberships.userId, targetId),
        ),
      )
      .limit(1);

    if (!membership) throw notFound('That person is not a member of this workspace');

    // A workspace needs exactly one owner.
    if (membership.role === 'owner' && role !== 'owner') {
      const [otherOwner] = await db
        .select({ userId: schema.memberships.userId })
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.workspaceId, tenant.workspaceId),
            eq(schema.memberships.role, 'owner'),
          ),
        )
        .limit(1);

      if (!otherOwner) {
        throw conflict('A workspace must keep at least one owner');
      }
    }

    await db
      .update(schema.memberships)
      .set({ role })
      .where(
        and(
          eq(schema.memberships.workspaceId, tenant.workspaceId),
          eq(schema.memberships.userId, targetId),
        ),
      );

    await db.insert(schema.auditLogs).values({
      workspaceId: tenant.workspaceId,
      actorName: tenant.actorName,
      action: 'member.role_changed',
      target: `${targetId} → ${role}`,
    });

    return c.json({ ok: true, role });
  },
);

/**
 * `DELETE /api/members/:userId` — remove somebody from the workspace.
 *
 * Admins and owners may remove members. Nobody may remove the owner, and
 * nobody may remove themselves — that would be an accidental lockout.
 */
memberRoutes.delete('/members/:userId', async (c) => {
  const tenant = tenantOf(c);
  requireRole(tenant, 'owner', 'admin');

  const db = getDb();
  const targetId = c.req.param('userId');

  if (targetId === tenant.userId) {
    throw badRequest('You cannot remove yourself from the workspace');
  }

  const [membership] = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.workspaceId, tenant.workspaceId),
        eq(schema.memberships.userId, targetId),
      ),
    )
    .limit(1);

  if (!membership) throw notFound('That person is not a member of this workspace');
  if (membership.role === 'owner') {
    throw forbidden('The workspace owner cannot be removed');
  }

  const [user] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, targetId))
    .limit(1);

  await db
    .delete(schema.memberships)
    .where(
      and(
        eq(schema.memberships.workspaceId, tenant.workspaceId),
        eq(schema.memberships.userId, targetId),
      ),
    );

  // Their sessions pointed at this workspace — drop them so they lose access.
  await db
    .delete(schema.sessions)
    .where(
      and(
        eq(schema.sessions.userId, targetId),
        eq(schema.sessions.activeWorkspaceId, tenant.workspaceId),
      ),
    );

  await db.insert(schema.auditLogs).values({
    workspaceId: tenant.workspaceId,
    actorName: tenant.actorName,
    action: 'member.removed',
    target: user?.email ?? targetId,
  });

  return c.body(null, 204);
});

export { memberRoutes as membersRoutes };
