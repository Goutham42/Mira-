import type { Metadata } from 'next';
import Link from 'next/link';

import { ResetPasswordForm } from '@/components/forms/password-reset-forms';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-3xl">Link not valid</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This reset link is missing its token. Request a new one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-accent"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl">Set a new password</h1>
      <div className="mt-8">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
