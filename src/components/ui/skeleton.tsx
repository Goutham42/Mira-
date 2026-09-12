import { cn } from '@/lib/utils';

/**
 * Skeletons must match the final element's box exactly — a mismatch is a
 * layout shift, which is the thing skeletons exist to prevent.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-muted', className)}
      {...props}
    />
  );
}
