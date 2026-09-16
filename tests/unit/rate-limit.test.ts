import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enforceRateLimit, isDistributed, rateLimit, rateLimits } from '@/lib/rate-limit';

/**
 * Exercises the in-process fallback: the suite runs without Upstash
 * credentials, which is the same path a single-instance deployment takes.
 */

let counter = 0;
/** Unique per assertion — the bucket map is module state shared by the file. */
const freshKey = () => `test:${counter++}`;

describe('rateLimit', () => {
  it('runs against the in-process backend in tests', () => {
    expect(isDistributed).toBe(false);
  });

  it('allows requests up to the limit', async () => {
    const key = freshKey();
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await rateLimit(key, 3, 60_000));

    expect(results.map((r) => r.success)).toEqual([true, true, true]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0]);
  });

  it('rejects the request after the limit is reached', async () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) await rateLimit(key, 3, 60_000);

    const denied = await rateLimit(key, 3, 60_000);
    expect(denied.success).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it('counts each key separately', async () => {
    const a = freshKey();
    const b = freshKey();
    await rateLimit(a, 1, 60_000);

    expect((await rateLimit(a, 1, 60_000)).success).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).success).toBe(true);
  });

  it('reports a reset time inside the window', async () => {
    const before = Date.now();
    const result = await rateLimit(freshKey(), 5, 60_000);

    expect(result.resetAt).toBeGreaterThan(before);
    expect(result.resetAt).toBeLessThanOrEqual(before + 60_000 + 50);
  });
});

describe('rateLimit window expiry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts a new window once the old one has passed', async () => {
    const key = freshKey();
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    expect((await rateLimit(key, 2, 60_000)).success).toBe(false);

    vi.advanceTimersByTime(60_001);

    const afterReset = await rateLimit(key, 2, 60_000);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });
});

describe('enforceRateLimit', () => {
  it('stays silent while under the limit', async () => {
    await expect(enforceRateLimit(freshKey(), 2, 60_000)).resolves.toBeUndefined();
  });

  it('throws a RATE_LIMITED error naming the wait once exceeded', async () => {
    const key = freshKey();
    await enforceRateLimit(key, 1, 60_000);

    await expect(enforceRateLimit(key, 1, 60_000)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    await expect(enforceRateLimit(key, 1, 60_000)).rejects.toThrow(/Try again in \d+ seconds?/);
  });
});

describe('rateLimits policies', () => {
  it('keeps credential endpoints tighter than browsing ones', () => {
    // A regression here is a security change, so it is asserted rather than
    // left to review: login must never be looser than search.
    expect(rateLimits.login.limit).toBeLessThan(rateLimits.search.limit);
    expect(rateLimits.passwordReset.limit).toBeLessThanOrEqual(rateLimits.login.limit);
  });

  it('defines a positive window for every policy', () => {
    for (const [name, policy] of Object.entries(rateLimits)) {
      expect(policy.limit, name).toBeGreaterThan(0);
      expect(policy.windowMs, name).toBeGreaterThan(0);
    }
  });
});
