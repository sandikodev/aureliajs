import { describe, expect, it } from 'bun:test';
import { assertAnotherOwnerExists, inviteState } from '../src/lib/membership-policy';

describe('Membership & Seat Policy (apps/api)', () => {
  describe('owner invariant', () => {
    it('refuses to demote the only owner', () => {
      // The old route found the target itself and treated it as "another" owner.
      expect(() => assertAnotherOwnerExists([])).toThrow(
        'A workspace must keep at least one owner',
      );
    });

    it('allows handing over ownership when a second owner exists', () => {
      expect(() => assertAnotherOwnerExists(['u-2'])).not.toThrow();
      expect(() => assertAnotherOwnerExists(['u-2', 'u-3'])).not.toThrow();
    });

    it('uses a 409 conflict so the UI can show a business-rule message', () => {
      try {
        assertAnotherOwnerExists([]);
      } catch (error) {
        expect((error as { status: number }).status).toBe(409);
        expect((error as { code: string }).code).toBe('conflict');
      }
    });
  });

  describe('invite state / seat reservation', () => {
    const now = new Date('2026-11-23T00:00:00.000Z').getTime();
    const expiresAt = new Date('2026-11-24T00:00:00.000Z');

    it('treats an unexpired, unaccepted invite as pending (reserves a seat)', () => {
      expect(inviteState({ acceptedAt: null, expiresAt }, now)).toBe('pending');
    });

    it('treats an expired invite as expired (does NOT reserve a seat)', () => {
      const expired = new Date(now - 1);
      expect(inviteState({ acceptedAt: null, expiresAt: expired }, now)).toBe('expired');
    });

    it('treats the exact expiry instant as expired', () => {
      expect(inviteState({ acceptedAt: null, expiresAt: new Date(now) }, now)).toBe('expired');
    });

    it('keeps accepted invites accepted even after the link expires', () => {
      const acceptedAt = new Date(now - 86_400_000);
      expect(inviteState({ acceptedAt, expiresAt: new Date(now - 1) }, now)).toBe('accepted');
    });
  });
});
