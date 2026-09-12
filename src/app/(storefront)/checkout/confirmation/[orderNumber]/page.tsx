import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getGuestOrderConfirmation } from '@/server/services/order.service';
import { isAppError } from '@/server/errors';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  let order;
  try {
    order = await getGuestOrderConfirmation(decodeURIComponent(orderNumber));
  } catch (error) {
    if (isAppError(error) && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  const money = (amount: number) => formatMoney(amount, order.currency, siteConfig.locale);
  const awaitingPayment = order.paymentStatus === 'UNPAID';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h1 className="mt-5 text-4xl">Thank you</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <span className="font-medium text-foreground">{order.orderNumber}</span>{' '}
          is confirmed. We have emailed the details to {order.email}.
        </p>
      </div>

      {awaitingPayment ? (
        <div className="mt-8 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium">Payment outstanding</p>
          <p className="mt-1 text-muted-foreground">
            We are holding your items. Payment instructions are on the way by email — your
            order ships once payment clears.
          </p>
        </div>
      ) : null}

      <div className="mt-10 rounded-lg border bg-surface p-6">
        <h2 className="font-display text-xl">Order summary</h2>

        <ul className="mt-5 space-y-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4">
              <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded bg-surface-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    aria-hidden
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.productTitle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.variantTitle} × {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular-nums">{money(item.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>

        <Separator className="my-5" />

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{money(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd className="tabular-nums">− {money(order.discountTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="tabular-nums">
              {order.shippingTotal === 0 ? 'Free' : money(order.shippingTotal)}
            </dd>
          </div>
          {order.taxTotal > 0 ? (
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd className="tabular-nums">{money(order.taxTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-2 text-base">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(order.grandTotal)}</dd>
          </div>
        </dl>

        <Separator className="my-5" />

        <div className="text-sm">
          <p className="label-caps">Shipping to</p>
          <address className="mt-2 not-italic leading-relaxed text-muted-foreground">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? (
              <>
                <br />
                {order.shippingAddress.line2}
              </>
            ) : null}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country}
          </address>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/orders">View your orders</Link>
        </Button>
      </div>
    </div>
  );
}
