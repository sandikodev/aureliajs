import type { Plan, Role } from '@aurelia-ops/shared';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { isProd } from '../env';
import { HttpError, forbidden, unauthorized, unavailable } from '../lib/errors';
import { log } from '../lib/log';
import { SESSION_COOKIE, loadSession } from '../lib/session';
import { resolveWorkspace } from '../lib/workspace';

export type TenantScope = {
  workspaceId: string;
  workspaceName: string;
  plan: Plan;
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
    log.error('session lookup failed', {
      requestId: c.get('requestId'),
      error: error instanceof Error ? error.message : String(error),
    });
    throw unavailable(
      isProd
        ? 'Service is temporarily unavailable'
        : 'Database is not reachable. Run `bun run db:up && bun run db:migrate && bun run db:seed`.',
    );
  }

  if (!session) throw unauthorized('Your session has expired. Sign in again.');

  let workspace;
  try {
    workspace = await resolveWorkspace(session.userId, session.activeWorkspaceId);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    log.error('workspace resolution failed', {
      requestId: c.get('requestId'),
      error: error instanceof Error ? error.message : String(error),
    });
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
