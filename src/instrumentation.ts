/**
 * Next.js instrumentation hook.
 *
 * Loads the Sentry runtime that matches where the code is actually executing.
 * `onRequestError` is what captures errors thrown inside Server Components,
 * which otherwise never reach a try/catch we control.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';
