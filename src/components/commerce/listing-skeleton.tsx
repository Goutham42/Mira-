import { ProductGridSkeleton } from './product-grid';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Listing placeholder.
 *
 * Mirrors the real listing's structure — heading, toolbar, sidebar, grid — so a
 * navigation swaps like-for-like instead of collapsing the page and jumping the
 * scroll position when the results land.
 */
export function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-4 w-96 max-w-full" />

      <div className="mt-10 flex items-center justify-between gap-4 border-b pb-4">
        <Skeleton className="h-9 w-24 lg:hidden" />
        <Skeleton className="ml-auto h-9 w-40" />
      </div>

      <div className="mt-8 flex gap-10">
        <div className="hidden w-56 shrink-0 space-y-8 lg:block">
          {[0, 1, 2].map((group) => (
            <div key={group} className="space-y-3">
              <Skeleton className="h-3 w-16" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-8 w-14" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <Skeleton className="mb-6 h-4 w-28" />
          <ProductGridSkeleton count={DEFAULT_PAGE_SIZE} />
        </div>
      </div>
    </div>
  );
}
