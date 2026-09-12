import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Only same-origin paths may be echoed back into the form.
  const safeCallback =
    callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
      ? callbackUrl
      : undefined;

  return (
    <div>
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to track orders and reach your wishlist.
      </p>

      <div className="mt-8">
        <LoginForm callbackUrl={safeCallback} />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link
          href={
            safeCallback
              ? `/register?callbackUrl=${encodeURIComponent(safeCallback)}`
              : '/register'
          }
          className="underline underline-offset-4 hover:text-foreground"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
