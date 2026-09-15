import { Skeleton } from '@/components/ui/skeleton';

/**
 * Product page placeholder.
 *
 * Laid out as gallery + buying column so the page does not reflow when the real
 * content arrives — the two halves keep their positions.
 */
export default function Loading() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Skeleton className="h-3 w-56" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col-reverse gap-4 md:flex-row">
            <div className="flex gap-3 md:w-20 md:flex-col">
              {[0, 1, 2].map((thumb) => (
                <Skeleton key={thumb} className="aspect-[3/4] w-16 md:w-full" />
              ))}
            </div>
            <Skeleton className="aspect-[3/4] flex-1" />
          </div>

          <div className="space-y-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />

            <div className="space-y-3 pt-4">
              <Skeleton className="h-3 w-12" />
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((value) => (
                  <Skeleton key={value} className="h-10 w-12" />
                ))}
              </div>
            </div>

            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </div>
    </>
  );
}
