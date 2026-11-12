import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { tenantOf } from '../middleware/tenant.js';

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

  const seatLimit = tenant.plan === 'free' ? 3 : tenant.plan === 'pro' ? 10 : 50;

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
    seatUsed: rows.length,
  });
});

/**
 * `PATCH /api/members/:userId` — change somebody's role.
 *
 * Owner only. Admins can remove members but cannot promote anyone to admin:
 * handing out admin rights is an owner decision.
 */
memberRoutes.patch('/members/:userId', async (c) => {
  const tenant = tenantOf(c);
  if (tenant.role !== 'owner') {
    throw forbidden('Only the workspace owner can change roles');
  }

  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ role: z.enum(['owner', 'admin', 'member']) }).safeParse(body);

  if (!parsed.success) {
    throw badRequest('Role must be one of owner, admin or member');
  }

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
  if (membership.role === 'owner' && parsed.data.role !== 'owner') {
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
    .set({ role: parsed.data.role })
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
    target: `${targetId} → ${parsed.data.role}`,
  });

  return c.json({ ok: true, role: parsed.data.role });
});

/**
 * `DELETE /api/members/:userId` — remove somebody from the workspace.
 *
 * Admins and owners may remove members. Nobody may remove the owner, and
 * nobody may remove themselves — that would be an accidental lockout.
 */
memberRoutes.delete('/members/:userId', async (c) => {
  const tenant = tenantOf(c);
  const db = getDb();
  const targetId = c.req.param('userId');

  if (tenant.role !== 'owner' && tenant.role !== 'admin') {
    throw forbidden('Only owners and admins can remove members');
  }

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
