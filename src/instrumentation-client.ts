import * as Sentry from '@sentry/nextjs';

/**
 * Browser error reporting.
 *
 * Session replay is deliberately off: it records what a shopper types, which
 * on a checkout page means addresses and phone numbers leaving the country.
 * Turn it on only with a masking policy someone has actually read.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
