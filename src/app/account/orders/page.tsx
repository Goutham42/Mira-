import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/commerce/order-status-badge';
import { Pagination } from '@/components/commerce/pagination';
import { listOrdersForCurrentUser } from '@/server/services/order.service';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const orders = await listOrdersForCurrentUser(Number(page) || 1);

  if (orders.items.length === 0) {
    return (
      <div className="rounded-lg border bg-surface px-6 py-16 text-center">
        <Package className="mx-auto size-8 text-subtle-foreground" aria-hidden />
        <p className="mt-4 font-display text-xl">No orders yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          When you place an order, it will appear here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ul className="space-y-4">
        {orders.items.map((order) => (
          <li key={order.id} className="rounded-lg border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.placedAt
                    ? new Intl.DateTimeFormat(siteConfig.locale, {
                        dateStyle: 'medium',
                      }).format(order.placedAt)
                    : 'Not yet placed'}
                  {' · '}
                  {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <OrderStatusBadge status={order.status} />
                <p className="text-sm tabular-nums">
                  {formatMoney(order.grandTotal, order.currency, siteConfig.locale)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {order.previewImages.map((url, index) => (
                  <div
                    key={`${order.id}-${index}`}
                    className="relative aspect-[3/4] w-12 overflow-hidden rounded bg-surface-muted"
                  >
                    <Image src={url} alt="" aria-hidden fill sizes="48px" className="object-cover" />
                  </div>
                ))}
              </div>

              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="shrink-0 text-sm underline underline-offset-4 hover:text-accent"
              >
                View order
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <Pagination
        page={orders.page}
        totalPages={orders.totalPages}
        searchParams={{}}
        basePath="/account/orders"
      />
    </div>
  );
}
