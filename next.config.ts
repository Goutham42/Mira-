import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

/**
 * Security headers applied to every response.
 *
 * CSP is intentionally omitted here: it needs per-request nonces and must be
 * relaxed for the payment provider iframe once one is chosen. It is added in
 * middleware during the hardening phase.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Where the build goes.
   *
   * Overridable so a dev server and a production build can run at the same
   * time — which they do whenever the end-to-end suite builds while someone is
   * working. Sharing one `.next` between them makes the running server read
   * files the build is replacing, and it fails with
   * "Invariant: Expected clientReferenceManifest to be defined", which reads
   * like an application bug and is not one.
   *
   *   NEXT_DIST_DIR=.next-dev npm run dev
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  /**
   * Packages Next must not bundle into the server build.
   *
   * pino spawns its pretty-printing transport in a worker thread and Prisma
   * loads a native binary — bundling either breaks module resolution at
   * runtime. Password hashing is WASM (hash-wasm) with the module inlined, so
   * it bundles normally and is deliberately not listed here.
   */
  serverExternalPackages: ['pino', 'pino-pretty', '@prisma/client'],

  experimental: {
    // Server Actions are the mutation path for our own UI; lock the body size
    // down since image uploads go direct-to-storage, not through an action.
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

/**
 * Sentry wrapping.
 *
 * Everything here is inert without a DSN, so a local or self-hosted build that
 * never sets one behaves exactly as it did before. Source maps are uploaded
 * only when an auth token is present, which keeps CI green on forks and on a
 * machine that has never seen a Sentry credential.
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Strip the uploaded maps from the client bundle: they are what turns a
  // minified stack trace readable in Sentry, and what hands a reader the whole
  // source if they are left served publicly.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Proxies Sentry's ingest through our own domain so ad blockers do not eat
  // the report before it is sent.
  tunnelRoute: '/monitoring',

  /**
   * Strips Sentry's own debug logging from the client bundle.
   *
   * The SDK deprecates this in favour of `webpack.treeshake.removeDebugLogging`,
   * but that option makes this build fail while prerendering /404 with
   * "<Html> should not be imported outside of pages/_document". Revisit when
   * upgrading the SDK; a deprecation warning beats a broken build.
   */
  disableLogger: true,
});
