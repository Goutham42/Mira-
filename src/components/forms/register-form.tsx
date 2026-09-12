'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerAction } from '@/actions/auth';
import { registerSchema, type RegisterInput } from '@/lib/validation/auth';

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      marketingOptIn: false,
    },
  });

  const marketingOptIn = watch('marketingOptIn');

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    const result = await registerAction(values);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" error={errors.firstName?.message} required>
          <Input
            id="firstName"
            autoComplete="given-name"
            autoFocus
            invalid={Boolean(errors.firstName)}
            {...register('firstName')}
          />
        </Field>

        <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
        </Field>
      </div>

      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        description="At least 10 characters"
        required
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>

      <Field
        label="Confirm password"
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

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="marketingOptIn"
          checked={marketingOptIn}
          onCheckedChange={(checked) => setValue('marketingOptIn', checked === true)}
        />
        <Label htmlFor="marketingOptIn" className="text-xs font-normal leading-relaxed">
          Email me about new arrivals and occasional offers. Unsubscribe any time.
        </Label>
      </div>

      <Button type="submit" full size="lg" loading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
