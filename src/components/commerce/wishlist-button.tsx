'use client';

import { useOptimistic, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { toggleWishlistAction } from '@/actions/wishlist';

/**
 * Wishlist toggle.
 *
 * Optimistic: the heart fills instantly and is reconciled by the action's
 * result. A signed-out shopper is told to sign in rather than silently failing.
 */
export function WishlistButton({
  productId,
  initialInWishlist,
  className,
  withLabel = false,
}: {
  productId: string;
  initialInWishlist: boolean;
  className?: string;
  withLabel?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [inWishlist, setOptimistic] = useOptimistic(initialInWishlist);

  function onToggle() {
    startTransition(async () => {
      setOptimistic(!inWishlist);
      const result = await toggleWishlistAction({ productId });

      if (!result.ok) {
        setOptimistic(inWishlist);
        toast.error(
          result.error.code === 'UNAUTHENTICATED'
            ? 'Sign in to save pieces to your wishlist.'
            : result.error.message,
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={inWishlist}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
      // Above the card's stretched link, which would otherwise swallow the click.
      className={cn(
        'relative z-10 inline-flex items-center gap-2 rounded-full bg-background/85 p-2 backdrop-blur-sm transition-colors hover:bg-background',
        withLabel && 'px-4 py-2.5',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-4 transition-colors',
          inWishlist ? 'fill-accent text-accent' : 'text-foreground',
        )}
      />
      {withLabel ? (
        <span className="text-sm">{inWishlist ? 'Saved' : 'Save'}</span>
      ) : null}
    </button>
  );
}
