import Link from 'next/link';
import { Search, User } from 'lucide-react';

import { mainNav, siteConfig } from '@/config/site';
import { getCartView } from '@/server/services/cart.service';
import { getCategoryTree } from '@/server/services/category.service';
import { getCurrentUser } from '@/server/auth/session';
import { isStaff } from '@/server/auth/rbac';
import { CartDrawer } from '@/components/commerce/cart-drawer';
import { AccountMenu } from './account-menu';
import { MobileNav } from './mobile-nav';

/**
 * Storefront header.
 *
 * A Server Component that reads session and cart directly. This is also what
 * makes every storefront route dynamically rendered — deliberate, since the
 * header shows per-shopper state. Page-level data is cached inside the
 * services instead.
 */
export async function SiteHeader() {
  const [cart, categories, user] = await Promise.all([
    getCartView(),
    getCategoryTree(),
    getCurrentUser(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <MobileNav categories={categories} />

        <Link href="/" className="mr-6 shrink-0 font-display text-2xl tracking-tight">
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-surface-muted"
            aria-label="Search"
          >
            <Search className="size-5" />
          </Link>

          {user ? (
            <AccountMenu
              firstName={user.firstName}
              email={user.email ?? ''}
              isStaff={isStaff(user.role)}
            />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-surface-muted"
              aria-label="Sign in"
            >
              <User className="size-5" />
            </Link>
          )}

          <CartDrawer cart={cart} />
        </div>
      </div>
    </header>
  );
}
