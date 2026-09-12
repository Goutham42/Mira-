import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import {
  FulfillmentStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/commerce/order-status-badge';
import { getOrderDetail } from '@/server/services/order.service';
import { isAppError } from '@/server/errors';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Order detail',
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  let order;
  try {
    // Ownership is enforced inside the service, not here.
    order = await getOrderDetail(decodeURIComponent(orderNumber));
  } catch (error) {
    if (isAppError(error) && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) {
      notFound();
    }
    throw error;
  }

  const money = (amount: number) => formatMoney(amount, order.currency, siteConfig.locale);
  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account/orders"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          ← All orders
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl">{order.orderNumber}</h2>
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <FulfillmentStatusBadge status={order.fulfillmentStatus} />
          </div>
        </div>

        {order.placedAt ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Placed {dateFormat.format(order.placedAt)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-lg border bg-surface p-5">
          <h3 className="font-display text-lg">Items</h3>

          <ul className="mt-4 divide-y">
            {order.lines.map((line) => (
              <li key={line.id} className="flex gap-4 py-4">
                <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded bg-surface-muted">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
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
                    {line.productSlug ? (
                      <Link href={`/p/${line.productSlug}`} className="text-sm hover:underline">
                        {line.productTitle}
                      </Link>
                    ) : (
                      <p className="text-sm">{line.productTitle}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {line.variantTitle} · {line.sku}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {money(line.unitPrice)} × {line.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">{money(line.lineTotal)}</p>
                </div>
              </li>
            ))}
          </ul>

          <Separator className="my-4" />

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
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border bg-surface p-5 text-sm">
            <h3 className="font-display text-lg">Shipping to</h3>
            <address className="mt-3 not-italic leading-relaxed text-muted-foreground">
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
              <br />
              {order.shippingAddress.phone}
            </address>
          </section>

          {order.payment ? (
            <section className="rounded-lg border bg-surface p-5 text-sm">
              <h3 className="font-display text-lg">Payment</h3>
              <dl className="mt-3 space-y-1.5 text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>Method</dt>
                  <dd className="text-foreground">{order.payment.method ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Status</dt>
                  <dd className="text-foreground">{order.payment.status}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="rounded-lg border bg-surface p-5">
            <h3 className="font-display text-lg">Timeline</h3>
            <ol className="mt-4 space-y-4">
              {order.timeline.map((event) => (
                <li key={event.id} className="text-sm">
                  <p>{event.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dateFormat.format(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
