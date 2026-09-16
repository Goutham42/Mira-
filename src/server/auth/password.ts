import 'server-only';
import { randomBytes } from 'node:crypto';
import { argon2Verify, argon2id } from 'hash-wasm';

/**
 * Argon2id parameters follow the OWASP Password Storage Cheat Sheet:
 * 19 MiB memory, 2 iterations, 1 degree of parallelism.
 *
 * WASM rather than a native addon: Windows Smart App Control blocks unsigned
 * `.node` binaries, which made `@node-rs/argon2` unloadable in local
 * development. The output is the standard PHC encoding
 * (`$argon2id$v=19$m=19456,t=2,p=1$...`), identical to what the native binding
 * produced, so hashes written before this change still verify.
 */
const OPTIONS = {
  memorySize: 19_456,
  iterations: 2,
  parallelism: 1,
  /** 32 bytes — the argon2 reference default. */
  hashLength: 32,
} as const;

/** 16 random bytes, the length the native binding used. */
const SALT_BYTES = 16;

/**
 * Hash of a throwaway value, computed once at boot.
 *
 * When a login is attempted for an address that does not exist, we verify
 * against this instead of returning early, so a missing account costs the same
 * wall-clock time as a wrong password. Without it, response timing enumerates
 * which emails are registered.
 */
const dummyHash: Promise<string> = hashPassword('mira::timing-equalisation-canary');

// Nothing awaits this at module scope; an unhandled rejection here would take
// the process down rather than fail the one login that needed it.
void dummyHash.catch(() => undefined);

export function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(SALT_BYTES),
    outputType: 'encoded',
    ...OPTIONS,
  });
}

export async function verifyPassword(
  storedHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!storedHash) {
    // No account, or an OAuth-only account with no password set.
    await argon2Verify({ hash: await dummyHash, password }).catch(() => false);
    return false;
  }

  try {
    return await argon2Verify({ hash: storedHash, password });
  } catch {
    // Malformed hash in the database — a failed login, not a crash.
    return false;
  }
}
