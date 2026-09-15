import Link from 'next/link';
import { ArrowRight, Heart, Search, User } from 'lucide-react';

import { siteConfig } from '@/config/site';
import { getCartView } from '@/server/services/cart.service';
import { getCategoryTree } from '@/server/services/category.service';
import { getCurrentUser } from '@/server/auth/session';
import { isStaff } from '@/server/auth/rbac';
import { CartDrawer } from '@/components/commerce/cart-drawer';
import { Logo } from '@/components/brand/logo';
import { AccountMenu } from './account-menu';
import { MainNav } from './main-nav';
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <MobileNav categories={categories} />

        <Link href="/" className="shrink-0" aria-label={`${siteConfig.name} — home`}>
          <Logo name={siteConfig.name} tagline={siteConfig.tagline} />
        </Link>

        <div className="flex flex-1 justify-center">
          <MainNav />
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-full p-2.5 text-foreground/80 transition-colors hover:bg-surface-muted hover:text-primary"
            aria-label="Search"
          >
            <Search className="size-5" strokeWidth={1.6} />
          </Link>

          <Link
            href="/account/wishlist"
            className="hidden items-center justify-center rounded-full p-2.5 text-foreground/80 transition-colors hover:bg-surface-muted hover:text-primary sm:inline-flex"
            aria-label="Wishlist"
          >
            <Heart className="size-5" strokeWidth={1.6} />
          </Link>

          <CartDrawer cart={cart} />

          {user ? (
            <AccountMenu
              firstName={user.firstName}
              email={user.email ?? ''}
              isStaff={isStaff(user.role)}
            />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full p-2.5 text-foreground/80 transition-colors hover:bg-surface-muted hover:text-primary lg:hidden"
              aria-label="Sign in"
            >
              <User className="size-5" strokeWidth={1.6} />
            </Link>
          )}

          <Link
            href="/shop"
            className="ml-2 hidden items-center gap-2 rounded-full bg-primary py-2.5 pl-6 pr-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 lg:inline-flex"
          >
            Shop Now
            <span className="grid size-7 place-items-center rounded-full bg-white/15">
              <ArrowRight className="size-3.5" strokeWidth={1.8} aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
