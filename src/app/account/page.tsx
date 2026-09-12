import Link from 'next/link';
import type { Metadata } from 'next';
import { Heart, MapPin, Package, User } from 'lucide-react';

import { getProfile } from '@/server/services/user.service';
import { listOrdersForCurrentUser } from '@/server/services/order.service';
import { getWishlist } from '@/server/services/wishlist.service';
import { listAddresses } from '@/server/services/user.service';

export const metadata: Metadata = {
  title: 'Account overview',
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const [profile, orders, wishlist, addresses] = await Promise.all([
    getProfile(),
    listOrdersForCurrentUser(1),
    getWishlist(),
    listAddresses(),
  ]);

  const cards = [
    {
      href: '/account/orders',
      icon: Package,
      title: 'Orders',
      value: `${orders.total} order${orders.total === 1 ? '' : 's'}`,
    },
    {
      href: '/account/wishlist',
      icon: Heart,
      title: 'Wishlist',
      value: `${wishlist.length} saved`,
    },
    {
      href: '/account/addresses',
      icon: MapPin,
      title: 'Addresses',
      value: `${addresses.length} saved`,
    },
    {
      href: '/account/profile',
      icon: User,
      title: 'Profile',
      value: profile.email,
    },
  ];

  return (
    <div className="space-y-10">
      {!profile.emailVerified ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium">Verify your email</p>
          <p className="mt-1 text-muted-foreground">
            We sent a verification link to {profile.email}. Verifying keeps your order
            history secure.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-lg border bg-surface p-5 transition-colors hover:border-border-strong"
            >
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-display text-lg">{card.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{card.value}</p>
            </Link>
          );
        })}
      </div>

      {orders.items.length > 0 ? (
        <section>
          <h2 className="text-2xl">Recent orders</h2>
          <ul className="mt-4 divide-y rounded-lg border bg-surface">
            {orders.items.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-muted/60"
                >
                  <span>
                    <span className="block text-sm">{order.orderNumber}</span>
                    <span className="block text-xs text-muted-foreground">
                      {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">View</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
