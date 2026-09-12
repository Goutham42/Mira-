import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id parameters follow the OWASP Password Storage Cheat Sheet:
 * 19 MiB memory, 2 iterations, 1 degree of parallelism.
 */
const OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hash of a throwaway value, computed once at boot.
 *
 * When a login is attempted for an address that does not exist, we verify
 * against this instead of returning early, so a missing account costs the same
 * wall-clock time as a wrong password. Without it, response timing enumerates
 * which emails are registered.
 */
const dummyHash: Promise<string> = hash('mira::timing-equalisation-canary', OPTIONS);

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(
  storedHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!storedHash) {
    // No account, or an OAuth-only account with no password set.
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }

  try {
    return await verify(storedHash, password);
  } catch {
    // Malformed hash in the database — a failed login, not a crash.
    return false;
  }
}
