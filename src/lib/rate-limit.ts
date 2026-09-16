import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { rateLimited } from '@/server/errors';

/**
 * Fixed-window rate limiter.
 *
 * Backed by Upstash Redis when it is configured, so a limit of 5 means 5
 * across the whole deployment rather than 5 per serverless instance. Without
 * Redis it falls back to an in-process map, which is correct on a single
 * instance and is what local development uses.
 *
 * The window is fixed rather than sliding to match the semantics the call
 * sites were written against: the reset time we report is the end of the
 * current window, and that is what the user-facing "try again in N seconds"
 * message depends on.
 */

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** Unix ms at which the current window ends. */
  resetAt: number;
};

// ---------------------------------------------------------------------------
// In-process fallback
// ---------------------------------------------------------------------------

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

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

// ---------------------------------------------------------------------------
// Redis backend
// ---------------------------------------------------------------------------

/**
 * Null when Upstash is not configured — the absence of the variables is the
 * switch, so local development and preview deployments need no extra flag.
 */
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

/**
 * One Ratelimit per distinct policy, built lazily and reused.
 *
 * Constructing one per call would be wasteful, and `ephemeralCache` only earns
 * its keep if the instance survives between requests: it lets an instance that
 * has already seen a key exceed its limit reject the next attempt without a
 * round trip, which matters on a metered free tier.
 */
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  const existing = limiters.get(cacheKey);
  if (existing) return existing;

  const created = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
    // Namespaced so the store can be shared with caching later without collisions.
    prefix: 'mira:rl',
    // Analytics costs extra Redis commands per call and we do not read it.
    analytics: false,
    ephemeralCache: new Map(),
  });
  limiters.set(cacheKey, created);
  return created;
}

// ---------------------------------------------------------------------------

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (redis) {
    try {
      const result = await getLimiter(limit, windowMs).limit(key);
      return { success: result.success, remaining: result.remaining, resetAt: result.reset };
    } catch (error) {
      // Degrade to the in-process limiter rather than failing the request.
      // Failing closed would lock every shopper out of login and checkout for
      // the length of a Redis outage; failing fully open would remove the
      // brute-force protection entirely. Per-instance limits are the middle.
      logger.error({ err: error }, 'Redis rate limit unavailable; using in-process fallback');
    }
  }

  return memoryRateLimit(key, limit, windowMs);
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

/** True when limits are enforced across the whole deployment, not per instance. */
export const isDistributed = redis !== null;
