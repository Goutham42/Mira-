import type { NextConfig } from 'next';

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
   * pino spawns its pretty-printing transport in a worker thread and Prisma and
   * argon2 load native binaries — bundling any of them breaks module resolution
   * at runtime.
   */
  serverExternalPackages: ['pino', 'pino-pretty', '@prisma/client', '@node-rs/argon2'],

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

export default nextConfig;
