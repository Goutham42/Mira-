import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CartLineItem } from '@/components/commerce/cart-line-item';
import { OrderSummary } from '@/components/commerce/order-summary';
import { DiscountForm } from '@/components/commerce/discount-form';
import { getCartView } from '@/server/services/cart.service';

export const metadata: Metadata = {
  title: 'Your bag',
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const cart = await getCartView();

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center">
        <ShoppingBag className="size-9 text-subtle-foreground" aria-hidden />
        <h1 className="mt-6 text-3xl">Your bag is empty</h1>
        <p className="mt-3 text-muted-foreground">
          Nothing here yet. Have a look at what has just landed.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl">Your bag</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div>
          {cart.hasIssues ? (
            <div
              role="alert"
              className="mb-6 rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
            >
              Some items changed while your bag was open. Review the notes below before
              checking out.
            </div>
          ) : null}

          <ul className="divide-y border-y">
            {cart.lines.map((line) => (
              <CartLineItem key={line.id} line={line} currency={cart.totals.currency} />
            ))}
          </ul>

          <div className="mt-8">
            <DiscountForm appliedCode={cart.discount?.code ?? null} />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary totals={cart.totals} discountCode={cart.discount?.code}>
            {/* `disabled` does nothing on an anchor, so block it with a real
                button instead of a link that looks disabled but still works. */}
            {cart.hasIssues ? (
              <Button size="lg" full disabled>
                Resolve the items above
              </Button>
            ) : (
              <Button asChild size="lg" full>
                <Link href="/checkout">Continue to checkout</Link>
              </Button>
            )}
            <Link
              href="/shop"
              className="mt-3 block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Continue shopping
            </Link>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
