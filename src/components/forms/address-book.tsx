'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveAddressSchema, type SaveAddressInput } from '@/lib/validation/address';
import { deleteAddressAction, saveAddressAction } from '@/actions/account';

export type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

const BLANK: SaveAddressInput = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'IN',
  type: 'SHIPPING',
  isDefaultShipping: false,
  isDefaultBilling: false,
};

function toFormValues(address: SavedAddress): SaveAddressInput {
  return {
    id: address.id,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    type: 'SHIPPING',
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
  };
}

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const [editing, setEditing] = useState<SaveAddressInput | null>(null);
  const [isDeleting, startDelete] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl">Saved addresses</h2>
        <Button size="sm" onClick={() => setEditing(BLANK)}>
          <Plus />
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-lg border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No addresses saved yet. Add one for faster checkout.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{address.fullName}</p>
                {address.isDefaultShipping ? (
                  <span className="label-caps shrink-0">Default</span>
                ) : null}
              </div>

              <address className="mt-2 text-sm not-italic leading-relaxed text-muted-foreground">
                {address.line1}
                {address.line2 ? (
                  <>
                    <br />
                    {address.line2}
                  </>
                ) : null}
                <br />
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
                <br />
                {address.phone}
              </address>

              <div className="mt-4 flex gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setEditing(toFormValues(address))}
                  className="underline underline-offset-4 hover:text-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() =>
                    startDelete(async () => {
                      const result = await deleteAddressAction({ id: address.id });
                      if (result.ok) toast.success('Address removed');
                      else toast.error(result.error.message);
                    })
                  }
                  className="text-destructive underline underline-offset-4"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent
            title={editing.id ? 'Edit address' : 'Add address'}
            description="Used to prefill checkout."
          >
            <AddressForm
              defaults={editing}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function AddressForm({
  defaults,
  onSaved,
  onCancel,
}: {
  defaults: SaveAddressInput;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaveAddressInput>({
    resolver: zodResolver(saveAddressSchema),
    defaultValues: defaults,
  });

  const isDefaultShipping = watch('isDefaultShipping');

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await saveAddressAction(values);
        if (result.ok) {
          toast.success('Address saved');
          onSaved();
        } else {
          setFormError(result.error.message);
        }
      })}
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <input type="hidden" {...register('id')} />
      <input type="hidden" {...register('type')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          htmlFor="fullName"
          error={errors.fullName?.message}
          required
          className="sm:col-span-2"
        >
          <Input id="fullName" autoComplete="name" {...register('fullName')} />
        </Field>

        <Field label="Phone" htmlFor="addressPhone" error={errors.phone?.message} required>
          <Input id="addressPhone" type="tel" autoComplete="tel" {...register('phone')} />
        </Field>

        <Field
          label="Postal code"
          htmlFor="postalCode"
          error={errors.postalCode?.message}
          required
        >
          <Input id="postalCode" autoComplete="postal-code" {...register('postalCode')} />
        </Field>

        <Field
          label="Address"
          htmlFor="line1"
          error={errors.line1?.message}
          required
          className="sm:col-span-2"
        >
          <Input id="line1" autoComplete="address-line1" {...register('line1')} />
        </Field>

        <Field
          label="Apartment, suite, etc."
          htmlFor="line2"
          error={errors.line2?.message}
          className="sm:col-span-2"
        >
          <Input id="line2" autoComplete="address-line2" {...register('line2')} />
        </Field>

        <Field label="City" htmlFor="city" error={errors.city?.message} required>
          <Input id="city" autoComplete="address-level2" {...register('city')} />
        </Field>

        <Field label="State" htmlFor="state" error={errors.state?.message} required>
          <Input id="state" autoComplete="address-level1" {...register('state')} />
        </Field>

        <Field label="Country" htmlFor="country" error={errors.country?.message} required>
          <Input
            id="country"
            autoComplete="country"
            maxLength={2}
            className="uppercase"
            {...register('country')}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="isDefaultShipping"
          checked={isDefaultShipping}
          onCheckedChange={(checked) => setValue('isDefaultShipping', checked === true)}
        />
        <Label htmlFor="isDefaultShipping" className="font-normal">
          Use as my default address
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save address
        </Button>
      </div>
    </form>
  );
}
