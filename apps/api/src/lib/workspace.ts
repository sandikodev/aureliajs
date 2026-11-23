import type { AuthSession, Role } from '@aurelia-ops/shared';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';

/** The public session shape plus the fields needed to derive entitlement. */
export type WorkspaceContext = NonNullable<AuthSession['workspace']> & {
  role: Role;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
};

/**
 * Pick the workspace for this user: the session's active one if the user is
 * still a member, otherwise the first membership. Tenancy is never inferred
 * from a client-supplied header.
 */
export async function resolveWorkspace(
  userId: string,
  preferredWorkspaceId: string | null,
): Promise<WorkspaceContext | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      plan: schema.workspaces.plan,
      stripeCustomerId: schema.workspaces.stripeCustomerId,
      subscriptionStatus: schema.workspaces.subscriptionStatus,
      trialEndsAt: schema.workspaces.trialEndsAt,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(eq(schema.memberships.userId, userId));

  const preferred = preferredWorkspaceId
    ? rows.find((row) => row.id === preferredWorkspaceId)
    : undefined;
  const row = preferred ?? rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    stripeCustomerId: row.stripeCustomerId,
    subscriptionStatus: row.subscriptionStatus,
    trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
    role: row.role,
  };
}
