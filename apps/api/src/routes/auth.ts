import {
  authSessionSchema,
  loginSchema,
  registerSchema,
  slugify,
  switchWorkspaceSchema,
  type AuthSession,
} from '@aurelia-ops/shared';
import { hashPassword, verifyPassword } from '../lib/password';
import { randomBytes } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { getDb, schema } from '../db/client';
import { isProd } from '../env';
import { isUniqueViolation } from '../lib/db-errors';
import { HttpError, conflict, issuesFromZod, unauthorized } from '../lib/errors';
import { clientIp } from '../lib/client-ip';
import { planFromSubscription } from '../lib/plan-limits';
import { resolveWorkspace, type WorkspaceContext } from '../lib/workspace';
import * as rateLimit from '../lib/rate-limit';
import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  hashSessionToken,
  loadSession,
  sessionCookie,
  sessionHintCookie,
} from '../lib/session';

const emptySession: AuthSession = { user: null, workspace: null, role: null };

function toSession(
  user: { id: string; email: string; name: string; avatarUrl: string | null; createdAt: Date },
  workspace: WorkspaceContext | null,
): AuthSession {
  return authSessionSchema.parse({
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
          plan: planFromSubscription(
            workspace.subscriptionStatus,
            Boolean(workspace.stripeCustomerId),
            workspace.plan,
          ),
          trialEndsAt: workspace.trialEndsAt,
        }
      : null,
    role: workspace?.role ?? null,
  });
}

export const authRoutes = new Hono();

/** 200 with nulls when signed out — see authSessionSchema in the shared package. */
authRoutes.get('/auth/me', async (c) => {
  const session = await loadSession(getCookie(c, SESSION_COOKIE));
  if (!session) return c.json(emptySession);

  const workspace = await resolveWorkspace(session.userId, session.activeWorkspaceId);
  return c.json(
    toSession(
      {
        id: session.userId,
        email: session.email,
        name: session.name,
        avatarUrl: session.avatarUrl,
        createdAt: session.createdAt,
      },
      workspace,
    ),
  );
});

/**
 * `POST /api/auth/signup` — create the first (owner) account of a workspace.
 *
 * This is the only way to provision a real account in production: there is no
 * seeded demo user. User, workspace, owner membership, audit entry and session
 * are written in one transaction, so a failure can never leave an account
 * without a workspace (or a workspace without an owner).
 */
authRoutes.post(
  '/auth/signup',
  zValidator('json', registerSchema, (result, c) => {
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
    const { email, password, name, workspaceName } = c.req.valid('json');

    const ip = clientIp(c);
    const key = `signup:${ip}`;
    const limit = rateLimit.hit(key, 5, 60 * 60);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      throw new HttpError(429, 'rate_limited', 'Too many sign-ups. Try again later.');
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing) throw conflict('An account with that email already exists');

    const passwordHash = await hashPassword(password);
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    const baseSlug = slugify(workspaceName) || `workspace-${randomBytes(4).toString('hex')}`;

    let created: {
      user: typeof schema.users.$inferSelect;
      workspace: typeof schema.workspaces.$inferSelect;
    };
    try {
      created = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(schema.users)
          .values({ email, name, passwordHash })
          .returning();

        if (!user) throw new HttpError(500, 'database_error', 'Failed to create account');

        const [taken] = await tx
          .select({ id: schema.workspaces.id })
          .from(schema.workspaces)
          .where(eq(schema.workspaces.slug, baseSlug))
          .limit(1);

        const slug = taken ? `${baseSlug}-${randomBytes(4).toString('hex')}` : baseSlug;
        const [workspace] = await tx
          .insert(schema.workspaces)
          .values({
            name: workspaceName,
            slug,
            plan: 'free',
            settings: { locale: 'en', weeklyDigest: true },
          })
          .returning();

        if (!workspace) throw new HttpError(500, 'database_error', 'Failed to create workspace');

        await tx.insert(schema.memberships).values({
          workspaceId: workspace.id,
          userId: user.id,
          role: 'owner',
        });

        await tx.insert(schema.auditLogs).values({
          workspaceId: workspace.id,
          actorName: name,
          action: 'workspace.created',
          target: workspaceName,
        });

        await tx.insert(schema.sessions).values({
          tokenHash: hashSessionToken(token),
          userId: user.id,
          activeWorkspaceId: workspace.id,
          expiresAt,
        });

        return { user, workspace };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      // The unique index is the source of truth. Distinguish the two conflicts
      // so the form can point at the right field.
      const [raced] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (raced) throw conflict('An account with that email already exists');
      throw conflict('That workspace name is already taken');
    }

    rateLimit.reset(key);
    setCookie(c, SESSION_COOKIE, token, sessionCookie());
    setCookie(c, SESSION_HINT_COOKIE, '1', sessionHintCookie());

    const context: WorkspaceContext = {
      id: created.workspace.id,
      name: created.workspace.name,
      slug: created.workspace.slug,
      plan: created.workspace.plan,
      stripeCustomerId: null,
      subscriptionStatus: 'none',
      trialEndsAt: null,
      role: 'owner',
    };

    return c.json(toSession(created.user, context), 201);
  },
);

authRoutes.post(
  '/auth/login',
  zValidator('json', loginSchema, (result, c) => {
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
    const { email, password } = c.req.valid('json');

    const ip = clientIp(c);
    const key = `login:${ip}:${email}`;
    const limit = rateLimit.hit(key, 8, 5 * 60);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again in a few minutes.');
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    // Same response for unknown email and wrong password: do not enumerate users.
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      throw unauthorized('Email or password is incorrect');
    }

    rateLimit.reset(key);

    const workspace = await resolveWorkspace(user.id, null);
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    await db.insert(schema.sessions).values({
      tokenHash: hashSessionToken(token),
      userId: user.id,
      activeWorkspaceId: workspace?.id ?? null,
      expiresAt,
    });

    // Drop expired sessions for this user so the table cannot grow unbounded.
    await db
      .delete(schema.sessions)
      .where(and(eq(schema.sessions.userId, user.id), lt(schema.sessions.expiresAt, new Date())));

    setCookie(c, SESSION_COOKIE, token, sessionCookie());
    setCookie(c, SESSION_HINT_COOKIE, '1', sessionHintCookie());
    return c.json(toSession(user, workspace));
  },
);

authRoutes.post('/auth/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const db = getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
  }
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    secure: isProd,
    sameSite: 'lax',
    httpOnly: true,
  });
  deleteCookie(c, SESSION_HINT_COOKIE, {
    path: '/',
    secure: isProd,
    sameSite: 'lax',
    httpOnly: false,
  });
  return c.body(null, 204);
});

/**
 * `POST /api/auth/switch-workspace` — change the active workspace.
 *
 * The session row keeps the active workspace, so switching is a database
 * update rather than a new cookie. The user must actually be a member of the
 * target workspace — the switcher is not an escalation path.
 */
authRoutes.post(
  '/auth/switch-workspace',
  zValidator('json', switchWorkspaceSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'validation_failed',
            message: 'A workspace id is required',
            issues: issuesFromZod(result.error),
          },
        },
        422,
      );
    }
  }),
  async (c) => {
    const { workspaceId } = c.req.valid('json');

    const token = getCookie(c, SESSION_COOKIE);
    if (!token) throw unauthorized('Your session has expired. Sign in again.');

    const session = await loadSession(token);
    if (!session) throw unauthorized('Your session has expired. Sign in again.');

    const db = getDb();
    const [membership] = await db
      .select({ role: schema.memberships.role })
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.userId, session.userId),
          eq(schema.memberships.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new HttpError(403, 'forbidden', 'You are not a member of that workspace');
    }

    await db
      .update(schema.sessions)
      .set({ activeWorkspaceId: workspaceId })
      .where(eq(schema.sessions.tokenHash, hashSessionToken(token)));

    const workspace = await resolveWorkspace(session.userId, workspaceId);

    return c.json(
      toSession(
        {
          id: session.userId,
          email: session.email,
          name: session.name,
          avatarUrl: session.avatarUrl,
          createdAt: session.createdAt,
        },
        workspace,
      ),
    );
  },
);
