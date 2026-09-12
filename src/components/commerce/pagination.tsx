import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Server-rendered pagination.
 *
 * Real anchors, not buttons: crawlers must be able to reach page 2, and a
 * shopper must be able to open a page in a new tab.
 */
export function Pagination({
  page,
  totalPages,
  searchParams,
  basePath,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page' || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
      else params.set(key, value);
    }
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Window of pages around the current one, always including first and last.
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, Math.max(page + 2, 5));
  const pages: number[] = [];
  for (let candidate = windowStart; candidate <= windowEnd; candidate += 1) {
    pages.push(candidate);
  }

  const linkClass = 'inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm transition-colors';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(linkClass, 'hover:bg-surface-muted')}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous page</span>
        </Link>
      ) : null}

      {windowStart > 1 ? (
        <>
          <Link href={hrefFor(1)} className={cn(linkClass, 'hover:bg-surface-muted')}>
            1
          </Link>
          {windowStart > 2 ? (
            <span className="px-1 text-subtle-foreground" aria-hidden>
              …
            </span>
          ) : null}
        </>
      ) : null}

      {pages.map((candidate) => (
        <Link
          key={candidate}
          href={hrefFor(candidate)}
          aria-current={candidate === page ? 'page' : undefined}
          className={cn(
            linkClass,
            candidate === page
              ? 'bg-foreground text-background'
              : 'hover:bg-surface-muted',
          )}
        >
          {candidate}
        </Link>
      ))}

      {windowEnd < totalPages ? (
        <>
          {windowEnd < totalPages - 1 ? (
            <span className="px-1 text-subtle-foreground" aria-hidden>
              …
            </span>
          ) : null}
          <Link href={hrefFor(totalPages)} className={cn(linkClass, 'hover:bg-surface-muted')}>
            {totalPages}
          </Link>
        </>
      ) : null}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(linkClass, 'hover:bg-surface-muted')}>
          <ChevronRight className="size-4" />
          <span className="sr-only">Next page</span>
        </Link>
      ) : null}
    </nav>
  );
}
