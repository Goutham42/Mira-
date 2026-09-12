import { randomInt } from 'node:crypto';

/**
 * Human-quotable order reference, e.g. MIRA-2026-7HK3QP.
 *
 * Random rather than sequential on purpose: a sequential number leaks total
 * order volume and invites enumeration of other people's orders. Uniqueness is
 * still guaranteed by the unique index — the caller retries on collision.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1

export function generateOrderNumber(date = new Date()): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `MIRA-${date.getUTCFullYear()}-${suffix}`;
}
