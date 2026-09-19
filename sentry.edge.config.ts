import * as Sentry from '@sentry/nextjs';

/** Middleware runs in its own runtime and needs its own init. */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  debug: false,
});
