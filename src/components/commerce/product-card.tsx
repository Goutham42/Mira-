import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { ProductCardData } from '@/types/catalog';
import { Price } from './price';
import { StarRating } from './star-rating';
import { WishlistButton } from './wishlist-button';

/**
 * Product tile.
 *
 * A Server Component — the only interactive part is the wishlist toggle, which
 * is its own client leaf. The whole tile is one link, so the tap target on a
 * phone is the entire card.
 */
export function ProductCard({
  product,
  priority = false,
  inWishlist = false,
  showWishlist = true,
}: {
  product: ProductCardData;
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean;
  inWishlist?: boolean;
  showWishlist?: boolean;
}) {
  return (
    <article className="group relative">
      <div className="hover-lift relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-transparent bg-surface-muted group-hover:border-border">
        {product.imageUrl ? (
          <>
            <Image
              src={product.imageUrl}
              alt={product.imageAlt ?? product.title}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
              className={cn(
                'object-cover transition-opacity duration-500',
                // Only zoom when there is no second shot to cross-fade to;
                // doing both at once reads as a glitch.
                !product.hoverImageUrl && 'media-zoom',
                product.hoverImageUrl && 'group-hover:opacity-0',
                product.isSoldOut && 'opacity-60',
              )}
            />
            {product.hoverImageUrl ? (
              <Image
                src={product.hoverImageUrl}
                alt=""
                aria-hidden
                fill
                loading="lazy"
                sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-subtle-foreground">
            No image
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isSoldOut ? (
            <span className="rounded-full bg-foreground/85 px-2.5 py-1 text-[0.625rem] uppercase tracking-wide text-background">
              Sold out
            </span>
          ) : product.isNew ? (
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-[0.625rem] uppercase tracking-wide">
              New
            </span>
          ) : null}
        </div>

        {showWishlist ? (
          <div className="absolute right-2 top-2">
            <WishlistButton productId={product.id} initialInWishlist={inWishlist} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="font-sans text-sm font-normal leading-snug tracking-normal">
          {/* Stretched link: the card is the hit area, but only the title is
              announced as the link target. */}
          <Link
            href={`/p/${product.slug}`}
            className="transition-colors after:absolute after:inset-0 group-hover:text-primary"
          >
            {product.title}
          </Link>
        </h3>

        <Price amount={product.price} compareAt={product.compareAtPrice} size="sm" />

        {product.rating ? (
          <StarRating value={product.rating.average} count={product.rating.count} />
        ) : null}

        {product.colors.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            {product.colors.length} colours
          </p>
        ) : null}
      </div>
    </article>
  );
}
