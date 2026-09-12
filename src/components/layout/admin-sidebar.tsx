'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  FolderTree,
  LayoutDashboard,
  Shirt,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { adminNav } from '@/config/site';

const ICONS = {
  LayoutDashboard,
  ShoppingBag,
  Shirt,
  FolderTree,
  Boxes,
  Users,
} as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {adminNav.map((item) => {
        const Icon = ICONS[item.icon];
        // Exact match for the dashboard, prefix match for sections.
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.title}
          </Link>
        );
      })}

      <Link
        href="/"
        className="mt-4 flex items-center gap-3 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Store className="size-4 shrink-0" aria-hidden />
        View storefront
      </Link>
    </nav>
  );
}
