'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * The last-resort boundary.
 *
 * `error.tsx` handles a page that throws; this catches a failure in the root
 * layout itself, which means React never mounted and no app chrome exists.
 * It has to render its own <html> and <body>, and it cannot rely on anything
 * the layout would have provided — including fonts and global styles.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#fbf8f3',
          color: '#2b2724',
          fontFamily: '-apple-system, Segoe UI, Helvetica, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <main>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 12px' }}>
            We hit a snag
          </h1>
          <p style={{ margin: '0 0 24px', color: '#6b625a', lineHeight: 1.6 }}>
            Something went wrong at our end. Reloading usually fixes it.
          </p>
          {error.digest ? (
            <p style={{ margin: '0 0 24px', fontFamily: 'monospace', fontSize: '12px', color: '#8a8179' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          {/*
            A plain anchor, not next/link: this boundary catches a failure in
            the root layout, which means the router may be part of what broke.
            A full document load is the only reliable way out.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: '#2b2724',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Back to the shop
          </a>
        </main>
      </body>
    </html>
  );
}
