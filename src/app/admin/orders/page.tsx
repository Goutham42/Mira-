import Link from 'next/link';
import type { OrderStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FulfillmentStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/commerce/order-status-badge';
import { Pagination } from '@/components/commerce/pagination';
import { listOrdersForAdmin } from '@/server/services/order.service';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Orders' };

const STATUSES: OrderStatus[] = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return value !== undefined && (STATUSES as string[]).includes(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;

  const orders = await listOrdersForAdmin({
    q: params.q,
    status: isOrderStatus(params.status) ? params.status : undefined,
    page: Number(params.page) || 1,
  });

  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: 'medium' });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.total} order{orders.total === 1 ? '' : 's'}
        </p>
      </header>

      <form method="get" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Order number or email"
          aria-label="Search orders"
          className="h-10 w-64 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-subtle-foreground"
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          aria-label="Filter by status"
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Filter
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Placed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Fulfilment</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {orders.items.length === 0 ? (
            <TableEmpty colSpan={6}>No orders match those filters.</TableEmpty>
          ) : (
            orders.items.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link href={`/admin/orders/${order.id}`} className="block">
                    <span className="block font-medium">{order.orderNumber}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.email}
                    </span>
                  </Link>
                </TableCell>

                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {order.placedAt ? dateFormat.format(order.placedAt) : '—'}
                </TableCell>

                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>

                <TableCell>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </TableCell>

                <TableCell>
                  <FulfillmentStatusBadge status={order.fulfillmentStatus} />
                </TableCell>

                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatMoney(order.grandTotal, order.currency, siteConfig.locale)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination
        page={orders.page}
        totalPages={orders.totalPages}
        searchParams={params}
        basePath="/admin/orders"
      />
    </div>
  );
}
