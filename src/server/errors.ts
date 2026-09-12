/**
 * Application error taxonomy.
 *
 * Services throw these; the HTTP and Server Action boundaries translate them
 * into responses. Anything that is not an AppError is an unexpected fault and
 * is logged and reported as a generic 500 — never leaked to the client.
 */

export type AppErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'PAYMENT_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OUT_OF_STOCK: 409,
  PAYMENT_FAILED: 402,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string[]>;
  /** Safe to show a shopper. Non-exposable errors get a generic message. */
  readonly expose: boolean;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { fields?: Record<string, string[]>; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = options?.fields;
    this.expose = code !== 'INTERNAL';
  }
}

export const badRequest = (message: string) => new AppError('BAD_REQUEST', message);
export const unauthenticated = (message = 'You need to sign in to continue.') =>
  new AppError('UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have access to this resource.') =>
  new AppError('FORBIDDEN', message);
export const notFound = (what = 'Resource') => new AppError('NOT_FOUND', `${what} not found.`);
export const conflict = (message: string) => new AppError('CONFLICT', message);
export const outOfStock = (message = 'That item is no longer available in the quantity requested.') =>
  new AppError('OUT_OF_STOCK', message);
export const rateLimited = (message = 'Too many attempts. Please try again shortly.') =>
  new AppError('RATE_LIMITED', message);

export function validationError(fields: Record<string, string[]>, message = 'Please check the highlighted fields.') {
  return new AppError('VALIDATION_ERROR', message, { fields });
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Shape returned to clients for any failed mutation. */
export type ActionError = {
  code: AppErrorCode;
  message: string;
  fields?: Record<string, string[]>;
};

export function toActionError(error: unknown): ActionError {
  if (isAppError(error) && error.expose) {
    return { code: error.code, message: error.message, fields: error.fields };
  }
  return { code: 'INTERNAL', message: 'Something went wrong. Please try again.' };
}
