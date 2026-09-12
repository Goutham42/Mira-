import Link from 'next/link';
import { AlertTriangle, IndianRupee, Package, ShoppingBag } from 'lucide-react';

import { getOrderStats, listOrdersForAdmin } from '@/server/services/order.service';
import { OrderStatusBadge } from '@/components/commerce/order-status-badge';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Dashboard' };

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-lg border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-3 font-display text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [stats, recentOrders] = await Promise.all([
    getOrderStats(),
    listOrdersForAdmin({ page: 1 }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last 30 days</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatMoney(stats.revenueMinor, siteConfig.currency, siteConfig.locale)}
          hint="Paid orders only"
          icon={IndianRupee}
        />
        <StatCard
          label="Orders"
          value={String(stats.orderCount)}
          hint="All statuses"
          icon={ShoppingBag}
        />
        <StatCard
          label="To fulfil"
          value={String(stats.awaitingFulfilment)}
          hint="Paid, not yet shipped"
          icon={Package}
        />
        <StatCard
          label="Low stock"
          value={String(stats.lowStockCount)}
          hint="3 units or fewer"
          icon={AlertTriangle}
        />
      </div>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm underline underline-offset-4 hover:text-accent"
          >
            View all
          </Link>
        </div>

        {recentOrders.items.length === 0 ? (
          <p className="mt-4 rounded-lg border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
            No orders yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border bg-surface">
            {recentOrders.items.slice(0, 8).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm">{order.orderNumber}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.email}
                    </span>
                  </span>

                  <span className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm tabular-nums">
                      {formatMoney(order.grandTotal, order.currency, siteConfig.locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
