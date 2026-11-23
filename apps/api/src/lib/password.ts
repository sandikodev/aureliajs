/**
 * Native Argon2id password hashing backed directly by the Bun runtime engine.
 * Eliminates native N-API addons, prebuilt binaries, and external dependencies.
 */

declare const Bun:
  | {
      password?: {
        hash(
          password: string,
          options?: { algorithm?: 'argon2id' | 'bcrypt'; memoryCost?: number; timeCost?: number }
        ): Promise<string>;
        verify(password: string, hash: string): Promise<boolean>;
      };
    }
  | undefined;

export async function hashPassword(password: string): Promise<string> {
  if (typeof Bun !== 'undefined' && Bun?.password) {
    return Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost: 19456,
      timeCost: 2,
    });
  }
  // Dynamic fallback for plain Node.js runtimes if ever executed outside Bun
  const { hash } = await import('@node-rs/argon2');
  return hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (typeof Bun !== 'undefined' && Bun?.password) {
    return Bun.password.verify(password, hash);
  }
  // Dynamic fallback for plain Node.js runtimes if ever executed outside Bun
  const { verify } = await import('@node-rs/argon2');
  return verify(hash, password);
}
