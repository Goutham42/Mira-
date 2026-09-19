import * as Sentry from '@sentry/nextjs';

/**
 * Server-side error reporting.
 *
 * Reads `process.env` directly rather than the validated `env` object: this
 * file is loaded by Next's instrumentation hook before the app is assembled,
 * and an unset DSN must degrade to "reporting off", never to a boot failure.
 * With no DSN the SDK is inert — no network calls, no overhead.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),

  // A dress shop does not need every request traced; 10% is enough to spot a
  // slow query without spending the free tier in a week.
  tracesSampleRate: 0.1,

  // Never ship PII to a third party by default. Order numbers and user ids in
  // breadcrumbs are enough to find a customer in the admin.
  sendDefaultPii: false,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  debug: false,
});
