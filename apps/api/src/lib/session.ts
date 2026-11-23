import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { isProd } from '../env';

export const SESSION_COOKIE = 'aurelia_session';
/**
 * Non-secret, JS-readable mirror of the session state. The static landing page
 * uses it to send signed-in visitors straight to /overview without booting the
 * SPA first. It grants no access on its own — every API route still checks the
 * HttpOnly `aurelia_session` cookie.
 */
export const SESSION_HINT_COOKIE = 'aurelia_ops_authed';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** 32 random bytes, base64url — the only time the raw token exists client-side. */
export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Only the hash is stored. A database leak therefore does not hand over live
 * sessions, and lookups stay a single indexed equality match.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Deliberately readable by the static landing page's inline bootstrap. */
export function sessionHintCookie() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export type LoadedSession = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  activeWorkspaceId: string | null;
};

/** Resolve a raw cookie token to a live session, or null. */
export async function loadSession(token: string | undefined): Promise<LoadedSession | null> {
  if (!token) return null;

  const db = getDb();
  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      avatarUrl: schema.users.avatarUrl,
      createdAt: schema.users.createdAt,
      activeWorkspaceId: schema.sessions.activeWorkspaceId,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(
      and(
        eq(schema.sessions.tokenHash, hashSessionToken(token)),
        gt(schema.sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return row ?? null;
}
