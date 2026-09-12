'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';
import type { CartView } from '@/types/cart';
import { CartLineItem } from './cart-line-item';

/**
 * Cart drawer.
 *
 * The cart is fetched on the server and passed in, so opening the drawer is
 * instant and there is no client-side cart store to fall out of sync. Mutations
 * inside it revalidate the layout, which pushes fresh data back down.
 */
export function CartDrawer({ cart }: { cart: CartView }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="relative inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-surface-muted"
        aria-label={`Open bag, ${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`}
      >
        <ShoppingBag className="size-5" />
        {cart.itemCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-accent text-[0.625rem] font-medium text-accent-foreground">
            {cart.itemCount > 9 ? '9+' : cart.itemCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent side="right" title="Your bag" description="Items in your shopping bag">
        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-8 text-subtle-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Your bag is empty.</p>
            <Button asChild variant="outline" onClick={() => setOpen(false)}>
              <Link href="/shop">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <CartLineItem
                  key={line.id}
                  line={line}
                  currency={cart.totals.currency}
                  compact
                />
              ))}
            </ul>

            <div className="border-t px-5 py-4">
              <div className="flex items-baseline justify-between text-sm">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {formatMoney(cart.totals.subtotal, cart.totals.currency, siteConfig.locale)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shipping and tax calculated at checkout.
              </p>

              <div className="mt-4 grid gap-2">
                <Button asChild full onClick={() => setOpen(false)}>
                  <Link href="/checkout">Checkout</Link>
                </Button>
                <Button asChild variant="outline" full onClick={() => setOpen(false)}>
                  <Link href="/cart">View bag</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
