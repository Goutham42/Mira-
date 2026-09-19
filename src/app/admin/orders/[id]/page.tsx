import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import {
  FulfillmentStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/commerce/order-status-badge';
import { OrderActions } from '@/components/admin/order-actions';
import { RefundPanel } from '@/components/admin/refund-panel';
import { ShipmentPanel } from '@/components/admin/shipment-panel';
import { getOrderDetailById } from '@/server/services/order.service';
import { getRefundableSummary } from '@/server/services/refund.service';
import {
  getShippableLines,
  listShipmentsForOrder,
} from '@/server/services/shipment.service';
import { getCurrentUser } from '@/server/auth/session';
import { hasPermission } from '@/server/auth/rbac';
import { isAppError } from '@/server/errors';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Order detail' };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  try {
    order = await getOrderDetailById(id);
  } catch (error) {
    if (isAppError(error) && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  // Fulfilment data is loaded alongside the order rather than inside the
  // panels, so the page renders in one pass with no client-side waterfall.
  const [shipments, shippable, user] = await Promise.all([
    listShipmentsForOrder(order.id),
    getShippableLines(order.id),
    getCurrentUser(),
  ]);

  // Refunds are an admin power, not a staff one, so the panel is absent rather
  // than disabled for anyone who could not act on it anyway.
  const canRefund = user ? hasPermission(user.role, 'order:refund') : false;
  const refundSummary = canRefund ? await getRefundableSummary(order.id) : null;

  const money = (amount: number) =>
    formatMoney(amount, order.currency, siteConfig.locale);
  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/orders"
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
        >
          ← All orders
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl">{order.orderNumber}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {order.email}
              {order.placedAt ? ` · ${dateFormat.format(order.placedAt)}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <FulfillmentStatusBadge status={order.fulfillmentStatus} />
          </div>
        </div>
      </header>

      <div className="bg-surface rounded-lg border p-5">
        <h2 className="label-caps">Actions</h2>
        <div className="mt-3">
          <OrderActions
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <section className="bg-surface rounded-lg border p-5">
            <h2 className="font-display text-lg">Items</h2>

            <ul className="mt-4 divide-y">
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-4 py-4">
                  <div className="bg-surface-muted relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        aria-hidden
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{line.productTitle}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {line.variantTitle} · {line.sku}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {money(line.unitPrice)} × {line.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 tabular-nums">{money(line.lineTotal)}</p>
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
                <dd className="tabular-nums">{money(order.shippingTotal)}</dd>
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

            {order.customerNote ? (
              <>
                <Separator className="my-4" />
                <div className="text-sm">
                  <p className="label-caps">Customer note</p>
                  <p className="text-muted-foreground mt-1.5">{order.customerNote}</p>
                </div>
              </>
            ) : null}
          </section>

          <ShipmentPanel orderId={order.id} shipments={shipments} shippable={shippable} />
        </div>

        <div className="space-y-6">
          {refundSummary ? (
            <RefundPanel orderId={order.id} summary={refundSummary} />
          ) : null}

          <section className="bg-surface rounded-lg border p-5 text-sm">
            <h2 className="font-display text-lg">Delivery address</h2>
            <address className="text-muted-foreground mt-3 leading-relaxed not-italic">
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
            <section className="bg-surface rounded-lg border p-5 text-sm">
              <h2 className="font-display text-lg">Payment</h2>
              <dl className="text-muted-foreground mt-3 space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt>Provider</dt>
                  <dd className="text-foreground">{order.payment.provider}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Method</dt>
                  <dd className="text-foreground">{order.payment.method ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Status</dt>
                  <dd className="text-foreground">{order.payment.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Amount</dt>
                  <dd className="text-foreground tabular-nums">
                    {money(order.payment.amount)}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="bg-surface rounded-lg border p-5">
            <h2 className="font-display text-lg">Timeline</h2>
            <ol className="mt-4 space-y-4">
              {order.timeline.map((event) => (
                <li key={event.id} className="text-sm">
                  <p>{event.message}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
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
