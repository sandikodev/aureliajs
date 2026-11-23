import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from '../src/lib/password';

describe('Password Hashing & Verification (apps/api - RFC 1)', () => {
  it('hashes a plaintext password into standard argon2id PHC format', async () => {
    const hash = await hashPassword('mySecurePassword123!');
    expect(hash).toContain('$argon2id$');
    expect(hash.length).toBeGreaterThan(40);
  });

  it('successfully verifies a matching password', async () => {
    const raw = 'correctHorseBatteryStaple';
    const hash = await hashPassword(raw);
    const isValid = await verifyPassword(raw, hash);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correctPassword');
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });
});
