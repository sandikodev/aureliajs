import { describe, expect, it, beforeEach } from 'bun:test';
import { RateLimiter, hit, reset, clear } from '../src/lib/rate-limit';

describe('Rate Limiter (apps/api)', () => {
  beforeEach(() => {
    clear();
  });

  it('allows hits within the configured limit', () => {
    const res1 = hit('test-ip-1', 3, 60);
    const res2 = hit('test-ip-1', 3, 60);
    const res3 = hit('test-ip-1', 3, 60);

    expect(res1.allowed).toBe(true);
    expect(res2.allowed).toBe(true);
    expect(res3.allowed).toBe(true);
  });

  it('blocks hits exceeding the limit and returns retryAfter', () => {
    hit('test-ip-2', 2, 60);
    hit('test-ip-2', 2, 60);
    const blocked = hit('test-ip-2', 2, 60);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfter).toBeGreaterThanOrEqual(1);
      expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it('resets a specific rate limit key on demand', () => {
    hit('test-ip-3', 1, 60);
    const blocked = hit('test-ip-3', 1, 60);
    expect(blocked.allowed).toBe(false);

    reset('test-ip-3');
    const allowed = hit('test-ip-3', 1, 60);
    expect(allowed.allowed).toBe(true);
  });

  it('enforces maximum capacity eviction to prevent unbounded memory leaks', () => {
    const limiter = new RateLimiter({ maxEntries: 3, cleanupIntervalMs: 0 });

    limiter.hit('key-1', 5, 60);
    limiter.hit('key-2', 5, 60);
    limiter.hit('key-3', 5, 60);
    expect(limiter.size).toBe(3);

    // Adding a 4th key when capacity is 3 should evict the oldest key (key-1)
    limiter.hit('key-4', 5, 60);
    expect(limiter.size).toBeLessThanOrEqual(3);

    // key-1 was evicted, so a new hit on key-1 starts a fresh bucket
    const res = limiter.hit('key-1', 1, 60);
    expect(res.allowed).toBe(true);
  });

  it('sweeps expired entries correctly', async () => {
    const limiter = new RateLimiter({ maxEntries: 10, cleanupIntervalMs: 0 });
    // Window of 0.01 seconds (10ms)
    limiter.hit('short-lived', 5, 0.01);
    expect(limiter.size).toBe(1);

    await new Promise((r) => setTimeout(r, 20));
    limiter.sweep();
    expect(limiter.size).toBe(0);
  });
});
