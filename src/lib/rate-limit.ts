import 'server-only';
import { rateLimited } from '@/server/errors';

/**
 * Fixed-window rate limiter.
 *
 * Backed by an in-process map, which is correct for a single instance and
 * degrades to per-instance limits when scaled horizontally. The interface is
 * deliberately async so a Redis backend can be swapped in behind it without
 * touching any call site.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Amortised cleanup; avoids an unbounded map without a timer.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { success: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  return {
    success: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Throws AppError('RATE_LIMITED') instead of returning a result. */
export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = await rateLimit(key, limit, windowMs);
  if (!result.success) {
    const seconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw rateLimited(`Too many attempts. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`);
  }
}

/** Named policies, so limits are reviewed in one place. */
export const rateLimits = {
  login: { limit: 5, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 3, windowMs: 60 * 60_000 },
  checkout: { limit: 10, windowMs: 10 * 60_000 },
  search: { limit: 60, windowMs: 60_000 },
  review: { limit: 5, windowMs: 60 * 60_000 },
} as const;
