import { Hono } from 'hono';
import { and, count, eq, isNull } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import {
  acceptInviteSchema,
  createInviteSchema,
  revokeInviteQuerySchema,
} from '@aurelia-ops/shared';
import { getDb, schema } from '../db/client';
import { HttpError, badRequest, conflict, issuesFromZod, notFound } from '../lib/errors';
import { limitsFor } from '../lib/plan-limits';
import { env } from '../env';
import { hash } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import { setCookie } from 'hono/cookie';
import { SESSION_COOKIE, sessionCookie } from '../lib/session';
import { sendInviteEmail } from '../services/email';
import * as rateLimit from '../lib/rate-limit';
import { requireRole, tenantOf } from '../middleware/tenant';

const invitesRoutes = new Hono();

/** Routes that must work without a session: the invite token is the credential. */
export const publicInviteRoutes = new Hono();

/**
 * `POST /api/invites` — invite somebody to the workspace.
 *
 * The invited email does **not** need an account yet: that is the whole
 * point of an invite. The account is created when the invite is accepted.
 *
 * Only the owner may invite. Admins can manage projects and members, but
 * handing out seats is an owner-level decision.
 */
invitesRoutes.post(
  '/invites',
  zValidator('json', createInviteSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Invalid input data',
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

    // Rate limit email dispatch per workspace to prevent resource exhaustion / abuse (Pillar 10)
    const limit = rateLimit.hit(`invite-send:${tenant.workspaceId}`, 25, 60);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      throw new HttpError(429, 'rate_limited', 'Too many invites sent. Please wait a moment.');
    }

    const { email, role } = c.req.valid('json');
    const db = getDb();

    // Already a member? There is nothing to invite.
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser) {
      const [membership] = await db
        .select({ id: schema.memberships.userId })
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.workspaceId, tenant.workspaceId),
            eq(schema.memberships.userId, existingUser.id),
          ),
        )
        .limit(1);

      if (membership) {
        throw conflict('That person is already a member of this workspace');
      }
    }

    // The seat limit is a hard limit: an open invitation already reserves a
    // seat, so it counts towards the total.
    const seatLimit = limitsFor(tenant.plan).seats;
    const [seatRow] = await db
      .select({ value: count() })
      .from(schema.memberships)
      .where(eq(schema.memberships.workspaceId, tenant.workspaceId));

    const [pendingRow] = await db
      .select({ value: count() })
      .from(schema.invites)
      .where(
        and(eq(schema.invites.workspaceId, tenant.workspaceId), isNull(schema.invites.acceptedAt)),
      );

    const used = Number(seatRow?.value ?? 0) + Number(pendingRow?.value ?? 0);
    if (used >= seatLimit) {
      throw new HttpError(
        402,
        'seat_limit_reached',
        `The ${tenant.plan} plan includes ${seatLimit} seats. Upgrade the plan to invite more people.`,
        [{ path: 'seats', message: `${used} of ${seatLimit} seats used` }],
      );
    }

    // An open invite for the same email replaces the old one, so the person
    // always holds a valid token.
    await db
      .delete(schema.invites)
      .where(
        and(
          eq(schema.invites.workspaceId, tenant.workspaceId),
          eq(schema.invites.email, email),
          isNull(schema.invites.acceptedAt),
        ),
      );

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db
      .insert(schema.invites)
      .values({
        tokenHash,
        workspaceId: tenant.workspaceId,
        email,
        role,
        expiresAt,
      })
      .returning({ id: schema.invites.id });

    if (!invite) {
      throw new HttpError(500, 'database_error', 'Failed to generate invitation');
    }

    await db.insert(schema.auditLogs).values({
      workspaceId: tenant.workspaceId,
      actorName: tenant.actorName,
      action: 'member.invited',
      target: email,
    });

    const acceptUrl = `${env.WEB_ORIGIN}/invite?token=${token}`;

    const emailResult = await sendInviteEmail({
      to: email,
      inviterName: tenant.actorName,
      workspaceName: tenant.workspaceName,
      role,
      acceptUrl,
      expiresAt,
    });

    return c.json(
      {
        invite: {
          id: invite.id,
          email,
          role,
          expiresAt: expiresAt.toISOString(),
        },
        acceptUrl,
        emailSent: emailResult.success,
        emailProvider: emailResult.provider,
      },
      201,
    );
  },
);

/**
 * `GET /api/invites` — list the open invitations for this workspace.
 */
invitesRoutes.get('/invites', async (c) => {
  const tenant = tenantOf(c);
  requireRole(tenant, 'owner', 'admin');

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.invites)
    .where(eq(schema.invites.workspaceId, tenant.workspaceId));

  const now = Date.now();

  return c.json(
    rows.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      state: invite.acceptedAt
        ? 'accepted'
        : invite.expiresAt.getTime() < now
          ? 'expired'
          : 'pending',
    })),
  );
});

/**
 * `DELETE /api/invites` — revoke an open invitation.
 *
 * An invitation is a credential: the token in it signs the invited person
 * in. Revoking it has to actually remove the token, not just hide the row.
 */
invitesRoutes.delete(
  '/invites',
  zValidator('query', revokeInviteQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'An email or invitation id is required',
            issues: issuesFromZod(result.error),
          },
        },
        400,
      );
    }
  }),
  async (c) => {
    const tenant = tenantOf(c);
    requireRole(tenant, 'owner');

    const { id, email } = c.req.valid('query');
    const db = getDb();
    const filters = [eq(schema.invites.workspaceId, tenant.workspaceId)];

    if (id) {
      filters.push(eq(schema.invites.id, id));
    } else if (email) {
      filters.push(eq(schema.invites.email, email));
    }

    const deleted = await db
      .delete(schema.invites)
      .where(and(...filters))
      .returning({ email: schema.invites.email });

    const deletedRow = deleted[0];
    if (!deletedRow) {
      throw notFound('No matching invitation');
    }

    await db.insert(schema.auditLogs).values({
      workspaceId: tenant.workspaceId,
      actorName: tenant.actorName,
      action: 'member.invite_revoked',
      target: deletedRow.email,
    });

    return c.body(null, 204);
  },
);

/**
 * `POST /api/invites/accept` — accept an invitation.
 *
 * Public: the token is the credential. Accepting creates the account when the
 * invited person does not have one yet, adds the membership and signs the
 * person in.
 */
publicInviteRoutes.post(
  '/invites/accept',
  zValidator('json', acceptInviteSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Invalid invite token',
            issues: issuesFromZod(result.error),
          },
        },
        400,
      );
    }
  }),
  async (c) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const limit = rateLimit.hit(`invite-accept:${ip}`, 15, 60);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again in a minute.');
    }

    const { token } = c.req.valid('json');
    const db = getDb();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const [invite] = await db
      .select()
      .from(schema.invites)
      .where(eq(schema.invites.tokenHash, tokenHash))
      .limit(1);

    if (!invite) {
      throw notFound('This invite link is not valid');
    }
    if (invite.acceptedAt) {
      throw conflict('This invite has already been used');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw badRequest('This invite has expired — ask the workspace owner for a new one');
    }

    // Find or create the user. A random password is stored so the account can
    // never be logged into with a guess; the invite link is the way in.
    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, invite.email))
      .limit(1);

    if (!user) {
      const randomPassword = randomBytes(32).toString('base64url');
      const passwordHash = await hash(randomPassword, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      // Derive a readable display name from the email local part.
      const localPart = invite.email.split('@')[0] ?? 'User';
      const name = localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => (part[0] ? part[0].toUpperCase() + part.slice(1) : part))
        .join(' ');

      const [created] = await db
        .insert(schema.users)
        .values({ email: invite.email, name: name || invite.email, passwordHash })
        .returning();

      if (!created) {
        throw new HttpError(500, 'database_error', 'Failed to provision user');
      }
      user = created;
    }

    // Add the membership (idempotent — accepting twice is not possible because
    // of the acceptedAt check above, but a re-run of the seed could race).
    const [existingMembership] = await db
      .select({ userId: schema.memberships.userId })
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.workspaceId, invite.workspaceId),
          eq(schema.memberships.userId, user.id),
        ),
      )
      .limit(1);

    if (!existingMembership) {
      await db.insert(schema.memberships).values({
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      });
    }

    await db
      .update(schema.invites)
      .set({ acceptedAt: new Date() })
      .where(eq(schema.invites.id, invite.id));

    await db.insert(schema.auditLogs).values({
      workspaceId: invite.workspaceId,
      actorName: user.name,
      action: 'member.invite_accepted',
      target: invite.email,
    });

    // Sign the new member in straight away — that is the point of a magic link.
    const sessionToken = randomBytes(32).toString('base64url');
    const sessionTokenHash = createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(schema.sessions).values({
      tokenHash: sessionTokenHash,
      userId: user.id,
      activeWorkspaceId: invite.workspaceId,
      expiresAt,
    });

    setCookie(c, SESSION_COOKIE, sessionToken, sessionCookie());

    const [workspace] = await db
      .select({
        id: schema.workspaces.id,
        name: schema.workspaces.name,
        slug: schema.workspaces.slug,
        plan: schema.workspaces.plan,
        trialEndsAt: schema.workspaces.trialEndsAt,
      })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, invite.workspaceId))
      .limit(1);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            plan: workspace.plan,
            trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
          }
        : null,
      role: invite.role,
    });
  },
);

export { invitesRoutes };
