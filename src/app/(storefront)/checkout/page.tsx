import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CheckoutForm, type CheckoutDefaults } from '@/components/forms/checkout-form';
import { getCartView } from '@/server/services/cart.service';
import { getCurrentUser } from '@/server/auth/session';
import { getDefaultShippingAddress } from '@/server/services/user.service';
import { getPaymentProvider } from '@/server/payments';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cart = await getCartView();

  // Nothing to buy, or the bag went stale — send them back rather than
  // rendering a form that cannot be submitted.
  if (cart.lines.length === 0) redirect('/cart');
  if (cart.hasIssues) redirect('/cart');

  const user = await getCurrentUser();
  const savedAddress = user ? await getDefaultShippingAddress() : null;

  const defaults: CheckoutDefaults = {
    email: user?.email ?? '',
    phone: savedAddress?.phone ?? '',
    shippingAddress: savedAddress
      ? {
          fullName: savedAddress.fullName,
          phone: savedAddress.phone,
          line1: savedAddress.line1,
          line2: savedAddress.line2 ?? '',
          city: savedAddress.city,
          state: savedAddress.state,
          postalCode: savedAddress.postalCode,
          country: savedAddress.country,
        }
      : null,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-4xl">Checkout</h1>
        {!user ? (
          <p className="text-sm text-muted-foreground">
            Have an account?{' '}
            <Link
              href="/login?callbackUrl=%2Fcheckout"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>{' '}
            for faster checkout.
          </p>
        ) : null}
      </div>

      <div className="mt-10">
        <CheckoutForm
          cart={cart}
          defaults={defaults}
          settlesOffline={getPaymentProvider().settlesOffline}
        />
      </div>
    </div>
  );
}
