import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/forms/password-reset-forms';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we will send you a link to set a new one.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
