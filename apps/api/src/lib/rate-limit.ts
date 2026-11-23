/**
 * In-memory fixed-window rate limiter with LRU-bounded eviction.
 *
 * Implements strict memory bounding to prevent denial-of-service / memory leaks
 * from unbounded IP key proliferation under traffic (Pillars 1, 7 & 10).
 * Can be instantiated per-domain or used via the default singleton (Pillar 5).
 */

export type Bucket = { count: number; resetAt: number };

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number };

export interface RateLimiterOptions {
  /** Maximum number of unique keys tracked simultaneously before evicting oldest. */
  maxEntries?: number;
  /** Milliseconds between expired bucket sweeping passes. */
  cleanupIntervalMs?: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly maxEntries: number;
  private readonly timer?: ReturnType<typeof setInterval>;

  constructor(options: RateLimiterOptions = {}) {
    this.maxEntries = options.maxEntries ?? 10_000;
    const cleanupInterval = options.cleanupIntervalMs ?? 60_000;

    if (cleanupInterval > 0) {
      this.timer = setInterval(() => this.sweep(), cleanupInterval);
      if (typeof this.timer === 'object' && 'unref' in this.timer) {
        this.timer.unref();
      }
    }
  }

  /**
   * Records an attempt against a key. Returns `{ allowed: true }` if within limit,
   * or `{ allowed: false, retryAfter: seconds }` if exceeded.
   */
  hit(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.ensureCapacity();
      this.buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { allowed: true };
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    return { allowed: true };
  }

  /** Explicitly reset/clear a rate limit bucket (e.g. after successful login). */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Clear all buckets (useful during testing or cache invalidation). */
  clear(): void {
    this.buckets.clear();
  }

  /** Number of currently tracked keys. */
  get size(): number {
    return this.buckets.size;
  }

  /** Stops background cleanup timer. */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** Sweeps expired keys from the bucket map. */
  sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private ensureCapacity(): void {
    if (this.buckets.size < this.maxEntries) return;

    // First attempt: evict expired entries
    this.sweep();
    if (this.buckets.size < this.maxEntries) return;

    // Second attempt: evict oldest entry (LRU via Map insertion order)
    const oldestKey = this.buckets.keys().next().value;
    if (oldestKey !== undefined) {
      this.buckets.delete(oldestKey);
    }
  }
}

/** Default process-wide rate limiter singleton. */
export const rateLimiter = new RateLimiter();

export const hit = (key: string, limit: number, windowSeconds: number): RateLimitResult =>
  rateLimiter.hit(key, limit, windowSeconds);

export const reset = (key: string): void => rateLimiter.reset(key);

export const clear = (): void => rateLimiter.clear();
