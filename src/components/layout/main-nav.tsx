'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { mainNav } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * Desktop primary navigation.
 *
 * A client component only because the current section is underlined, which
 * needs the pathname. The rest of the header stays a Server Component.
 */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-9">
        {mainNav.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative block py-1 text-sm transition-colors duration-200',
                  active ? 'text-primary' : 'text-foreground/75 hover:text-primary',
                  // The sweep only applies to inactive items; the active one
                  // keeps a permanent rule so the two never double up.
                  !active && 'link-sweep',
                )}
              >
                {item.title}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 left-0 h-px w-full bg-primary"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
