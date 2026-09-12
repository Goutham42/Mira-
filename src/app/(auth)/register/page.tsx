import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Faster checkout, order history and a saved wishlist.
      </p>

      <div className="mt-8">
        <RegisterForm />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
