import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ProductGrid } from '@/components/commerce/product-grid';
import { getNewArrivals } from '@/server/services/product.service';
import { getWishlistProductIds } from '@/server/services/wishlist.service';

/**
 * Real products on the homepage.
 *
 * The rest of the page is editorial; without this a first-time visitor cannot
 * see a single price or piece they can actually buy. Renders nothing at all
 * when the catalogue is empty, so an unseeded store still looks finished.
 */
export async function NewArrivals() {
  const [products, wishlistIds] = await Promise.all([
    getNewArrivals(4),
    getWishlistProductIds(),
  ]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-wide text-muted-foreground">Just landed</p>
          <h2 className="mt-2 font-display text-4xl sm:text-[2.75rem]">New Arrivals</h2>
        </div>

        <Link
          href="/shop?sort=newest"
          className="group inline-flex shrink-0 items-center gap-2 pb-1 text-sm text-foreground/80 transition-colors hover:text-primary"
        >
          View All
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.6}
            aria-hidden
          />
        </Link>
      </div>

      <ProductGrid products={products} wishlistProductIds={wishlistIds} className="mt-8" />
    </section>
  );
}
