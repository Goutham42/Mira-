'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { requestPasswordResetAction, resetPasswordAction } from '@/actions/auth';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/lib/validation/auth';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  if (sent) {
    return (
      <div className="rounded-lg border bg-surface p-6 text-center">
        <MailCheck className="mx-auto size-7 text-success" aria-hidden />
        <p className="mt-4 font-display text-xl">Check your inbox</p>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for that address, we have sent a link to reset your password.
          It expires in 30 minutes.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-accent"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await requestPasswordResetAction(values);
        // Success either way: the response must not reveal whether the address
        // is registered.
        if (result.ok) setSent(true);
        else setFormError(result.error.message);
      })}
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>

      <Button type="submit" full size="lg" loading={isSubmitting}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await resetPasswordAction(values);
        if (result.ok) router.push('/login?reset=1');
        else setFormError(result.error.message);
      })}
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <input type="hidden" {...register('token')} />

      <Field
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        description="At least 10 characters"
        required
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
        required
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
      </Field>

      <p className="text-xs text-muted-foreground">
        Changing your password signs you out everywhere else.
      </p>

      <Button type="submit" full size="lg" loading={isSubmitting}>
        Set new password
      </Button>
    </form>
  );
}
