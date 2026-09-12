import { z } from 'zod';

/**
 * Environment validation.
 *
 * Parsed once at module load. A missing or malformed variable throws here
 * rather than surfacing as an unexplained 500 three screens into checkout.
 *
 * Client variables are declared separately and referenced by their literal
 * `process.env.NEXT_PUBLIC_*` names so Next can statically inline them into
 * the browser bundle.
 */

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  APP_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: optionalUrl,
  AUTH_TRUST_HOST: z.preprocess(emptyToUndefined, z.coerce.boolean().default(false)),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,

  PAYMENT_PROVIDER: z.enum(['manual']).default('manual'),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().min(1).default('Mira <orders@mira.example>'),
  EMAIL_REPLY_TO: optionalString,

  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
  SENTRY_DSN: optionalString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  FREE_SHIPPING_THRESHOLD_MINOR: z.coerce.number().int().nonnegative().default(200_000),
  STANDARD_SHIPPING_FEE_MINOR: z.coerce.number().int().nonnegative().default(9_900),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().max(120).default(15),
  TAX_RATE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),

  SEED_ADMIN_EMAIL: optionalString,
  SEED_ADMIN_PASSWORD: optionalString,
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STORE_NAME: z.string().min(1).default('Mira'),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().length(3).default('INR'),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: optionalString,
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
});

function format(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

// Literal property access is required: Next replaces these at build time.
const rawClientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const clientParsed = clientSchema.safeParse(rawClientEnv);
if (!clientParsed.success) {
  throw new Error(`Invalid public environment variables:\n${format(clientParsed.error)}`);
}

export const clientEnv = clientParsed.data;

/**
 * Server-only configuration. Importing this from a Client Component is a build
 * error by design — the `server-only` guard lives in the modules that use it.
 */
function loadServerEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${format(parsed.error)}`);
  }
  return parsed.data;
}

// During a client bundle pass `process.env` holds only NEXT_PUBLIC_* values, so
// server parsing is skipped there; nothing on the client reads `env` anyway.
export const env = typeof window === 'undefined' ? loadServerEnv() : ({} as ReturnType<typeof loadServerEnv>);

export const isProduction = clientEnv.NEXT_PUBLIC_APP_URL.startsWith('https://');
