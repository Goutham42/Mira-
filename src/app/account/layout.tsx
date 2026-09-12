import Link from 'next/link';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireUserPage } from '@/server/auth/session';

const ACCOUNT_NAV = [
  { title: 'Overview', href: '/account' },
  { title: 'Orders', href: '/account/orders' },
  { title: 'Wishlist', href: '/account/wishlist' },
  { title: 'Addresses', href: '/account/addresses' },
  { title: 'Profile', href: '/account/profile' },
] as const;

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Layout-level gate. Middleware already redirected an anonymous visitor, but
  // that is a convenience — this is the check that actually runs on every
  // request, and each service below asserts ownership again.
  const user = await requireUserPage('/account');

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <header>
          <p className="label-caps">Your account</p>
          <h1 className="mt-1 text-4xl">
            {user.firstName ? `Hello, ${user.firstName}` : 'Your account'}
          </h1>
        </header>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-14">
          <nav aria-label="Account" className="lg:w-48 lg:shrink-0">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {ACCOUNT_NAV.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
