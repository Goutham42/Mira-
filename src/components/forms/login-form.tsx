'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { loginAction } from '@/actions/auth';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', redirectTo: callbackUrl },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const result = await loginAction(values);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    router.push(result.data.redirectTo);
    // The header renders session state on the server, so the route must
    // re-fetch rather than reuse the cached signed-out shell.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

      <Field label="Password" htmlFor="password" error={errors.password?.message} required>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" full size="lg" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
