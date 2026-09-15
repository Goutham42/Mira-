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
                  'relative block py-1 text-sm transition-colors',
                  active ? 'text-primary' : 'text-foreground/75 hover:text-primary',
                )}
              >
                {item.title}
                <span
                  aria-hidden
                  className={cn(
                    'absolute -bottom-0.5 left-0 h-px w-full origin-left bg-primary transition-transform duration-300',
                    active ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
