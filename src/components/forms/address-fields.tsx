'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { CheckoutInput } from '@/lib/validation/checkout';

type AddressKey = 'shippingAddress' | 'billingAddress';

/**
 * Address fields, reused for shipping and billing.
 *
 * `autoComplete` tokens are scoped with the section prefix so a browser can
 * fill two different addresses on one page without cross-contaminating them.
 */
export function AddressFields({
  prefix,
  register,
  errors,
  autoCompleteSection,
}: {
  prefix: AddressKey;
  register: UseFormRegister<CheckoutInput>;
  errors: FieldErrors<CheckoutInput>;
  autoCompleteSection: string;
}) {
  const fieldErrors = errors[prefix];
  const ac = (token: string) => `section-${autoCompleteSection} ${token}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Full name"
        htmlFor={`${prefix}.fullName`}
        error={fieldErrors?.fullName?.message}
        required
        className="sm:col-span-2"
      >
        <Input
          id={`${prefix}.fullName`}
          autoComplete={ac('name')}
          invalid={Boolean(fieldErrors?.fullName)}
          {...register(`${prefix}.fullName`)}
        />
      </Field>

      <Field
        label="Phone"
        htmlFor={`${prefix}.phone`}
        error={fieldErrors?.phone?.message}
        required
      >
        <Input
          id={`${prefix}.phone`}
          type="tel"
          inputMode="tel"
          autoComplete={ac('tel')}
          invalid={Boolean(fieldErrors?.phone)}
          {...register(`${prefix}.phone`)}
        />
      </Field>

      <Field
        label="Postal code"
        htmlFor={`${prefix}.postalCode`}
        error={fieldErrors?.postalCode?.message}
        required
      >
        <Input
          id={`${prefix}.postalCode`}
          autoComplete={ac('postal-code')}
          invalid={Boolean(fieldErrors?.postalCode)}
          {...register(`${prefix}.postalCode`)}
        />
      </Field>

      <Field
        label="Address"
        htmlFor={`${prefix}.line1`}
        error={fieldErrors?.line1?.message}
        required
        className="sm:col-span-2"
      >
        <Input
          id={`${prefix}.line1`}
          autoComplete={ac('address-line1')}
          placeholder="House number and street"
          invalid={Boolean(fieldErrors?.line1)}
          {...register(`${prefix}.line1`)}
        />
      </Field>

      <Field
        label="Apartment, suite, etc."
        htmlFor={`${prefix}.line2`}
        error={fieldErrors?.line2?.message}
        className="sm:col-span-2"
      >
        <Input
          id={`${prefix}.line2`}
          autoComplete={ac('address-line2')}
          {...register(`${prefix}.line2`)}
        />
      </Field>

      <Field label="City" htmlFor={`${prefix}.city`} error={fieldErrors?.city?.message} required>
        <Input
          id={`${prefix}.city`}
          autoComplete={ac('address-level2')}
          invalid={Boolean(fieldErrors?.city)}
          {...register(`${prefix}.city`)}
        />
      </Field>

      <Field
        label="State"
        htmlFor={`${prefix}.state`}
        error={fieldErrors?.state?.message}
        required
      >
        <Input
          id={`${prefix}.state`}
          autoComplete={ac('address-level1')}
          invalid={Boolean(fieldErrors?.state)}
          {...register(`${prefix}.state`)}
        />
      </Field>

      <Field
        label="Country"
        htmlFor={`${prefix}.country`}
        error={fieldErrors?.country?.message}
        description="Two-letter country code"
        required
      >
        <Input
          id={`${prefix}.country`}
          autoComplete={ac('country')}
          maxLength={2}
          className="uppercase"
          invalid={Boolean(fieldErrors?.country)}
          {...register(`${prefix}.country`)}
        />
      </Field>
    </div>
  );
}
