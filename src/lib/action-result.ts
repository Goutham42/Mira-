import { toActionError, type ActionError } from '@/server/errors';

/**
 * Return type for every Server Action.
 *
 * Actions never throw across the RSC boundary: an uncaught throw in production
 * surfaces as an opaque digest with no field-level detail, which is useless for
 * form UX. `run` narrows every failure into a typed, safe payload instead.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: ActionError): ActionResult<never> => ({ ok: false, error });

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Next signals redirect/notFound by throwing; those must propagate.
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      /^(NEXT_REDIRECT|NEXT_NOT_FOUND)/.test((error as { digest: string }).digest)
    ) {
      throw error;
    }

    const actionError = toActionError(error);
    if (actionError.code === 'INTERNAL') {
      // Dynamic import keeps pino out of any bundle that only needs the types.
      const { logger } = await import('./logger');
      logger.error({ err: error }, 'Unhandled error in server action');
    }
    return { ok: false, error: actionError };
  }
}
