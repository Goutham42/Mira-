'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { mainNav } from '@/config/site';
import type { CategoryNode } from '@/types/catalog';

export function MobileNav({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-surface-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </SheetTrigger>

      <SheetContent side="left" title="Menu" description="Site navigation">
        <nav className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2.5 font-display text-lg transition-colors hover:bg-surface-muted"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 0 ? (
            <div className="mt-6 border-t pt-6">
              <p className="label-caps px-3">Browse</p>
              <ul className="mt-2 space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/c/${category.path}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
                    >
                      {category.name}
                      <span className="text-xs text-subtle-foreground">
                        {category.productCount}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 border-t pt-6">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
                >
                  My account
                </Link>
              </li>
              <li>
                <Link
                  href="/account/wishlist"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
                >
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
