import type { Role } from '@aureliajs/shared';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { HttpError, forbidden, unauthorized, unavailable } from '../lib/errors.js';
import { SESSION_COOKIE, loadSession } from '../lib/session.js';
import { resolveWorkspace } from '../lib/workspace.js';

export type TenantScope = {
  workspaceId: string;
  workspaceName: string;
  plan: 'free' | 'pro';
  userId: string;
  actorName: string;
  role: Role;
};

declare module 'hono' {
  interface ContextVariableMap {
    tenant: TenantScope;
  }
}

/**
 * Resolve the tenant for every `/api/*` request (except `/api/auth/*`).
 *
 * M1: the session cookie is verified, the user is loaded from the session row
 * and the workspace comes from a membership query. Routes never see cookies or
 * headers — they call `tenantOf(c)`. If the session is missing or expired the
 * request is rejected with 401 before any handler runs.
 */
export const tenant = (): MiddlewareHandler => async (c, next) => {
  let session;
  try {
    session = await loadSession(getCookie(c, SESSION_COOKIE));
  } catch (error) {
    console.error('[api] session lookup failed', error);
    throw unavailable(
      'Database is not reachable. Run `pnpm db:up && pnpm db:migrate && pnpm db:seed`.',
    );
  }

  if (!session) throw unauthorized('Your session has expired. Sign in again.');

  let workspace;
  try {
    workspace = await resolveWorkspace(session.userId, session.activeWorkspaceId);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('[api] workspace resolution failed', error);
    throw unavailable('Could not load the workspace');
  }

  if (!workspace) throw forbidden('You are not a member of any workspace');

  c.set('tenant', {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    plan: workspace.plan,
    userId: session.userId,
    actorName: session.name,
    role: workspace.role,
  });
  await next();
};

export function tenantOf(c: Context): TenantScope {
  return c.get('tenant');
}

/** Use after `tenantOf(c)` in a handler: `requireRole(tenant, 'owner', 'admin')`. */
export function requireRole(tenant: TenantScope, ...roles: Role[]): void {
  if (!roles.includes(tenant.role)) {
    throw forbidden(`This action requires the ${roles.join(' or ')} role`);
  }
}
