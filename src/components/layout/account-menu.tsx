'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Heart, LayoutDashboard, LogOut, Package, User } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/actions/auth';

export function AccountMenu({
  firstName,
  email,
  isStaff,
}: {
  firstName: string | null;
  email: string;
  isStaff: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-surface-muted"
        aria-label="Account menu"
      >
        <User className="size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-foreground">{firstName ?? 'Your account'}</span>
          <span className="block truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account">
            <User />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package />
            Orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist">
            <Heart />
            Wishlist
          </Link>
        </DropdownMenuItem>

        {isStaff ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboard />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => logoutAction());
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
