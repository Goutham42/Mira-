'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OrderSummary } from '@/components/commerce/order-summary';
import {
  PaymentMethodPicker,
  type PaymentMethodValue,
} from '@/components/commerce/payment-method-picker';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation/checkout';
import { placeOrderAction } from '@/actions/checkout';
import type { CartView } from '@/types/cart';
import { AddressFields } from './address-fields';

export type CheckoutDefaults = {
  email: string;
  phone: string;
  shippingAddress: CheckoutInput['shippingAddress'] | null;
};

const EMPTY_ADDRESS: CheckoutInput['shippingAddress'] = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'IN',
};

export function CheckoutForm({
  cart,
  defaults,
  settlesOffline,
}: {
  cart: CartView;
  defaults: CheckoutDefaults;
  settlesOffline: boolean;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: defaults.email,
      phone: defaults.phone,
      shippingAddress: defaults.shippingAddress ?? EMPTY_ADDRESS,
      billingSameAsShipping: true,
      billingAddress: EMPTY_ADDRESS,
      customerNote: '',
      paymentMethod: 'UPI',
      acceptTerms: true,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const billingSameAsShipping = watch('billingSameAsShipping');
  const paymentMethod = watch('paymentMethod');
  const acceptTerms = watch('acceptTerms');

  async function onSubmit(values: CheckoutInput) {
    setSubmitError(null);

    const result = await placeOrderAction(values);

    if (!result.ok) {
      // Map server-side field errors back onto the form where they belong.
      if (result.error.fields) {
        for (const [path, messages] of Object.entries(result.error.fields)) {
          setError(path as keyof CheckoutInput, {
            message: messages[0] ?? 'Invalid value',
          });
        }
      }
      setSubmitError(result.error.message);
      toast.error(result.error.message);
      return;
    }

    // A redirect-based provider sends the shopper away to authorise; otherwise
    // the order is already recorded and we go straight to confirmation.
    if (result.data.redirectUrl) {
      window.location.assign(result.data.redirectUrl);
      return;
    }

    router.push(`/checkout/confirmation/${result.data.orderNumber}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="space-y-12">
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-2xl">
              Contact
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                htmlFor="email"
                error={errors.email?.message}
                description="Your order confirmation goes here"
                required
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </Field>

              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  invalid={Boolean(errors.phone)}
                  {...register('phone')}
                />
              </Field>
            </div>
          </section>

          <section aria-labelledby="shipping-heading">
            <h2 id="shipping-heading" className="text-2xl">
              Shipping address
            </h2>
            <div className="mt-5">
              <AddressFields
                prefix="shippingAddress"
                register={register}
                errors={errors}
                autoCompleteSection="shipping"
              />
            </div>
          </section>

          <section aria-labelledby="billing-heading">
            <h2 id="billing-heading" className="text-2xl">
              Billing address
            </h2>

            <div className="mt-5 flex items-center gap-2.5">
              <Checkbox
                id="billingSameAsShipping"
                checked={billingSameAsShipping}
                onCheckedChange={(checked) =>
                  setValue('billingSameAsShipping', checked === true, {
                    shouldValidate: true,
                  })
                }
              />
              <Label htmlFor="billingSameAsShipping" className="font-normal">
                Same as shipping address
              </Label>
            </div>

            {!billingSameAsShipping ? (
              <div className="mt-6">
                <AddressFields
                  prefix="billingAddress"
                  register={register}
                  errors={errors}
                  autoCompleteSection="billing"
                />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="text-2xl">
              Payment
            </h2>
            <div className="mt-5">
              <PaymentMethodPicker
                value={paymentMethod as PaymentMethodValue}
                onChange={(next) => setValue('paymentMethod', next, { shouldValidate: true })}
                settlesOffline={settlesOffline}
              />
              {errors.paymentMethod ? (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {errors.paymentMethod.message}
                </p>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="note-heading">
            <h2 id="note-heading" className="text-2xl">
              Order note
            </h2>
            <div className="mt-5">
              <Field
                label="Anything we should know?"
                htmlFor="customerNote"
                error={errors.customerNote?.message}
              >
                <Textarea
                  id="customerNote"
                  maxLength={500}
                  placeholder="Delivery instructions, gift message…"
                  {...register('customerNote')}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary totals={cart.totals} discountCode={cart.discount?.code}>
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) =>
                    setValue('acceptTerms', checked === true, {
                      shouldValidate: true,
                    })
                  }
                  aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
                />
                <Label htmlFor="acceptTerms" className="text-xs font-normal leading-relaxed">
                  I agree to the terms of service and privacy policy.
                </Label>
              </div>

              {errors.acceptTerms ? (
                <p id="terms-error" role="alert" className="text-xs text-destructive">
                  {errors.acceptTerms.message}
                </p>
              ) : null}

              {submitError ? (
                <p role="alert" className="text-xs text-destructive">
                  {submitError}
                </p>
              ) : null}

              <Button type="submit" size="lg" full loading={isSubmitting}>
                Place order
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden />
                Your details are sent over an encrypted connection.
              </p>
            </div>
          </OrderSummary>

          <ul className="mt-6 space-y-3 rounded-lg border bg-surface p-4">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <span className="block truncate">{line.productTitle}</span>
                  <span className="text-muted-foreground">
                    {line.variantTitle} × {line.quantity}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </form>
  );
}
