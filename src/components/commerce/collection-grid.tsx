'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { loadMoreProductsAction, type ListingQuery } from '@/actions/catalog';
import { cn } from '@/lib/utils';
import type { ProductCardData } from '@/types/catalog';
import { DENSITY_CLASS, useListingPreferences } from './listing-preferences';
import { ProductCard } from './product-card';
import { QuickViewDialog } from './quick-view-dialog';

/**
 * The results grid, with infinite scroll.
 *
 * The first page is rendered on the server and handed in as `initialItems`, so
 * the page is complete and indexable before any of this runs; scrolling only
 * ever appends. The server-rendered numbered pagination stays in the markup
 * below the grid — it is how crawlers and anyone without JavaScript still reach
 * page 2, which pure infinite scroll would strand.
 *
 * A manual button sits alongside the observer. Auto-loading on scroll cannot be
 * triggered by a keyboard alone, so without it a keyboard user reaches the end
 * of page one and stops.
 */
export function CollectionGrid({
  initialItems,
  initialWishlistIds,
  query,
  initialPage,
  totalPages,
  total,
  paginationFallback,
}: {
  initialItems: ProductCardData[];
  initialWishlistIds: string[];
  /** Everything except `page`, which this component advances itself. */
  query: Omit<ListingQuery, 'page'>;
  initialPage: number;
  totalPages: number;
  total: number;
  /** Server-rendered numbered links, kept for crawlers and no-JS. */
  paginationFallback: React.ReactNode;
}) {
  const { density, view } = useListingPreferences();

  const [items, setItems] = useState(initialItems);
  const [wishlistIds, setWishlistIds] = useState(() => new Set(initialWishlistIds));
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  const hasNext = page < totalPages;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing again while a request is in flight.
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasNext) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await loadMoreProductsAction({ ...query, page: page + 1 });

      if (result.ok) {
        setItems((current) => {
          // The catalogue can change between pages; de-duplicate rather than
          // render the same product twice with a duplicate React key.
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...result.data.items.filter((item) => !seen.has(item.id))];
        });
        setWishlistIds(new Set(result.data.wishlistProductIds));
        setPage(result.data.page);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('Could not load more products.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasNext, page, query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    // No sentinel means nothing left to load; no observer means an old browser,
    // where the button below is the way through.
    if (!sentinel || !hasNext || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      // Start fetching before the shopper reaches the bottom, so the next rows
      // are usually there by the time they arrive.
      { rootMargin: '600px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNext, loadMore]);

  const isList = view === 'list';

  return (
    <>
      <div
        className={cn(
          'grid',
          isList ? 'grid-cols-1 gap-y-6' : cn('gap-x-4 gap-y-8', DENSITY_CLASS[density]),
        )}
      >
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < 4}
            inWishlist={wishlistIds.has(product.id)}
            view={view}
            onQuickView={setQuickViewSlug}
          />
        ))}
      </div>

      {/* Announced politely so a screen reader hears that more arrived without
          being yanked away from whatever it was reading. */}
      <p aria-live="polite" className="sr-only">
        {loading ? 'Loading more products' : `Showing ${items.length} of ${total} products`}
      </p>

      {hasNext ? (
        <div ref={sentinelRef} className="mt-10 flex flex-col items-center gap-3">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading more…</span>
          ) : (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="rounded-md border border-border-strong px-5 py-2 text-sm transition-colors hover:bg-surface-muted"
            >
              Load more
            </button>
          )}
          <p className="text-xs text-subtle-foreground">
            Showing {items.length} of {total}
          </p>
        </div>
      ) : (
        <p className="mt-10 text-center text-xs text-subtle-foreground">
          {items.length === total ? `All ${total} products shown` : null}
        </p>
      )}

      {error ? (
        <p className="mt-4 text-center text-sm text-destructive" role="alert">
          {error}{' '}
          <button type="button" onClick={() => void loadMore()} className="underline">
            Try again
          </button>
        </p>
      ) : null}

      {/*
        Crawlers and no-JS visitors never run the observer, so the numbered
        links remain the real navigation for them. Hidden from pointer users,
        who have the grid above, but left in the accessibility tree and the
        HTML source.
      */}
      <div className="sr-only">{paginationFallback}</div>

      <QuickViewDialog slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
    </>
  );
}
