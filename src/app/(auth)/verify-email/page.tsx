import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';

import { verifyEmail } from '@/server/services/user.service';
import { isAppError } from '@/server/errors';

export const metadata: Metadata = {
  title: 'Verify your email',
  robots: { index: false, follow: false },
};

/**
 * Verification runs on the server during render.
 *
 * Safe as a GET because the token is single-use and consuming it is the whole
 * point of following the link — there is no other state to change.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let error: string | null = null;

  if (!token) {
    error = 'This verification link is missing its token.';
  } else {
    try {
      await verifyEmail(token);
    } catch (caught) {
      error = isAppError(caught)
        ? caught.message
        : 'We could not verify your email. Try again.';
    }
  }

  return (
    <div className="text-center">
      {error ? (
        <>
          <XCircle className="mx-auto size-8 text-destructive" aria-hidden />
          <h1 className="mt-4 text-3xl">Verification failed</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
          <h1 className="mt-4 text-3xl">Email verified</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Thank you — your account is fully set up.
          </p>
        </>
      )}

      <Link
        href="/account"
        className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-accent"
      >
        Go to your account
      </Link>
    </div>
  );
}
