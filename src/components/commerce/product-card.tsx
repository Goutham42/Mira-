'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Eye } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ProductCardData } from '@/types/catalog';
import type { ViewMode } from './listing-preferences';
import { Price } from './price';
import { StarRating } from './star-rating';
import { WishlistButton } from './wishlist-button';

const SIZES = '(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw';

/**
 * Product tile.
 *
 * A Client Component since the redesign: the colour swatches swap the image in
 * place and the quick-view button opens a modal, neither of which can be done
 * from the server. The card is still one stretched link, so the tap target on a
 * phone remains the whole tile — the interactive bits sit above it on `z-10`,
 * which is why they are clickable at all.
 */
export function ProductCard({
  product,
  priority = false,
  inWishlist = false,
  showWishlist = true,
  view = 'grid',
  onQuickView,
}: {
  product: ProductCardData;
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean;
  inWishlist?: boolean;
  showWishlist?: boolean;
  view?: ViewMode;
  /** Omitted where there is no modal to open, e.g. the wishlist page. */
  onQuickView?: (slug: string) => void;
}) {
  // Null means "no swatch chosen", which is not the same as the first colour —
  // it keeps the merchandised default image rather than forcing a selection.
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const activeImage = (activeColor && product.colorImages[activeColor]) || product.imageUrl;
  // A colour-specific shot replaces the hover pair; cross-fading to an unrelated
  // colour while one is selected reads as a bug.
  const hoverImage =
    activeColor && product.colorImages[activeColor] ? null : product.hoverImageUrl;

  const isList = view === 'list';

  return (
    <article className={cn('group relative', isList && 'flex gap-5')}>
      <div
        className={cn(
          'hover-lift relative overflow-hidden rounded-lg border border-transparent bg-surface-muted group-hover:border-border',
          isList ? 'aspect-[3/4] w-28 shrink-0 sm:w-36' : 'aspect-[3/4] w-full',
        )}
      >
        {activeImage ? (
          <>
            <Image
              key={activeImage}
              src={activeImage}
              alt={product.imageAlt ?? product.title}
              fill
              priority={priority}
              sizes={isList ? '150px' : SIZES}
              className={cn(
                'object-cover transition-opacity duration-500',
                // Only zoom when there is no second shot to cross-fade to;
                // doing both at once reads as a glitch.
                !hoverImage && 'media-zoom',
                hoverImage && 'group-hover:opacity-0',
                product.isSoldOut && 'opacity-60',
              )}
            />
            {hoverImage ? (
              <Image
                src={hoverImage}
                alt=""
                aria-hidden
                fill
                loading="lazy"
                sizes={isList ? '150px' : SIZES}
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
          <div className="absolute right-2 top-2 z-10">
            <WishlistButton productId={product.id} initialInWishlist={inWishlist} />
          </div>
        ) : null}

        {onQuickView && !isList ? (
          <button
            type="button"
            onClick={() => onQuickView(product.slug)}
            className={cn(
              'absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-2',
              'rounded-md bg-background/95 py-2 text-xs font-medium shadow-sm backdrop-blur-sm',
              // Hidden until hover on pointer devices; always visible on touch,
              // where there is no hover to reveal it.
              'transition-all duration-200 lg:translate-y-2 lg:opacity-0',
              'lg:group-hover:translate-y-0 lg:group-hover:opacity-100',
              'focus-visible:translate-y-0 focus-visible:opacity-100',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
            Quick view
            <span className="sr-only"> of {product.title}</span>
          </button>
        ) : null}
      </div>

      <div className={cn('space-y-1', isList ? 'min-w-0 flex-1 py-1' : 'mt-3')}>
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
          <div className="relative z-10 flex flex-wrap items-center gap-1.5 pt-1">
            {product.colors.slice(0, 5).map((color) => {
              const active = activeColor === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setActiveColor(active ? null : color.value)}
                  aria-pressed={active}
                  aria-label={`Preview ${product.title} in ${color.value}`}
                  title={color.value}
                  className={cn(
                    'size-4 rounded-full border transition-transform hover:scale-110',
                    active
                      ? 'ring-1 ring-foreground ring-offset-1 ring-offset-background'
                      : 'border-border',
                  )}
                  style={{ backgroundColor: color.hexColor ?? 'transparent' }}
                />
              );
            })}
            {product.colors.length > 5 ? (
              <span className="text-xs text-subtle-foreground">
                +{product.colors.length - 5}
              </span>
            ) : null}
          </div>
        ) : null}

        {isList && onQuickView ? (
          <button
            type="button"
            onClick={() => onQuickView(product.slug)}
            className="relative z-10 mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            <Eye className="size-3.5" aria-hidden />
            Quick view
            <span className="sr-only"> of {product.title}</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}
