'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { phone } from '@/lib/validation/common';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { changePasswordAction, updateProfileAction } from '@/actions/account';

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().max(60).optional().or(z.literal('')),
  phone: phone.optional().or(z.literal('')),
  marketingOptIn: z.boolean(),
});

type ProfileInput = z.infer<typeof profileSchema>;

export function ProfileForm({ defaults }: { defaults: ProfileInput }) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });

  const marketingOptIn = watch('marketingOptIn');

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await updateProfileAction(values);
        if (result.ok) toast.success('Profile updated');
        else setFormError(result.error.message);
      })}
    >
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
            invalid={Boolean(errors.firstName)}
            {...register('firstName')}
          />
        </Field>

        <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
        </Field>
      </div>

      <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          invalid={Boolean(errors.phone)}
          {...register('phone')}
        />
      </Field>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="marketingOptIn"
          checked={marketingOptIn}
          onCheckedChange={(checked) => setValue('marketingOptIn', checked === true)}
        />
        <Label htmlFor="marketingOptIn" className="text-xs font-normal leading-relaxed">
          Email me about new arrivals and occasional offers.
        </Label>
      </div>

      <Button type="submit" loading={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await changePasswordAction(values);
        if (result.ok) {
          reset();
          toast.success('Password changed. Other devices have been signed out.');
        } else {
          setFormError(result.error.message);
        }
      })}
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Field
        label="Current password"
        htmlFor="currentPassword"
        error={errors.currentPassword?.message}
        required
      >
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(errors.currentPassword)}
          {...register('currentPassword')}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="newPassword"
        error={errors.password?.message}
        description="At least 10 characters"
        required
      >
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmNewPassword"
        error={errors.confirmPassword?.message}
        required
      >
        <Input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
      </Field>

      <Button type="submit" variant="outline" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}
