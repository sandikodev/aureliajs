import { and, gt, isNull } from 'drizzle-orm';
import { schema } from '../db/client';
import { conflict } from './errors';

/**
 * Membership & seat invariants shared by the member and invite routes.
 *
 * These rules are stated once here instead of being copied as slightly
 * different `where` clauses into several handlers. That matters because the
 * two expensive mistakes in this area are both "almost right" copies:
 * counting an expired invite as a reserved seat, and checking for "another"
 * owner without actually excluding the owner being demoted.
 */

/**
 * The visible state of an invite. An unaccepted link stops reserving a seat
 * the moment it expires — a dead credential is not a reservation.
 */
export function inviteState(
  invite: { acceptedAt: Date | null; expiresAt: Date },
  now: number = Date.now(),
): 'accepted' | 'pending' | 'expired' {
  if (invite.acceptedAt) return 'accepted';
  return invite.expiresAt.getTime() > now ? 'pending' : 'expired';
}

/** Drizzle mirror of `inviteState(invite, now.getTime()) === 'pending'`. */
export function activeInviteWhere(now: Date = new Date()) {
  return and(isNull(schema.invites.acceptedAt), gt(schema.invites.expiresAt, now));
}

/**
 * Guard the "exactly one owner" invariant.
 *
 * `otherOwnerIds` must contain owners *other than* the target. Passing the
 * full owner list makes the check useless when the target is the only owner.
 * Kept as a function so the edge case is unit-testable without a database.
 */
export function assertAnotherOwnerExists(otherOwnerIds: readonly string[]): void {
  if (otherOwnerIds.length === 0) {
    throw conflict('A workspace must keep at least one owner');
  }
}
