import { Skeleton } from '@/components/ui/skeleton';

/**
 * Fallback for storefront routes without their own skeleton.
 *
 * Its only job is to prove the click registered: without a loading file the
 * previous page just sits there while the server renders, which reads as a
 * dead button.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-2/3" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4, 5].map((line) => (
          <Skeleton key={line} className={line % 3 === 2 ? 'h-4 w-2/3' : 'h-4 w-full'} />
        ))}
      </div>
    </div>
  );
}
