import { authSessionSchema, loginSchema, type AuthSession } from '@aureliajs/shared';
import { verify } from '@node-rs/argon2';
import { and, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { getDb, schema } from '../db/client.js';
import { HttpError, unauthorized } from '../lib/errors.js';
import { resolveWorkspace, type WorkspaceContext } from '../lib/workspace.js';
import * as rateLimit from '../lib/rate-limit.js';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  hashSessionToken,
  loadSession,
  sessionCookie,
} from '../lib/session.js';

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
          plan: workspace.plan,
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

authRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'validation_failed', 'Check the form', []);
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const key = `login:${ip}:${parsed.data.email}`;
  const limit = rateLimit.hit(key, 8, 5 * 60);
  if (!limit.allowed) {
    c.header('Retry-After', String(limit.retryAfter));
    throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again in a few minutes.');
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email))
    .limit(1);

  // Same response for unknown email and wrong password: do not enumerate users.
  const passwordOk = user ? await verify(user.passwordHash, parsed.data.password) : false;
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
  return c.json(toSession(user, workspace));
});

authRoutes.post('/auth/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const db = getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.body(null, 204);
});
