'use server';

import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { rateLimits, enforceRateLimit } from '@/lib/rate-limit';
import { listProducts } from '@/server/services/product.service';
import { getProductBySlug } from '@/server/services/product.service';
import { getWishlistProductIds } from '@/server/services/wishlist.service';
import type { ProductCardData, QuickViewData } from '@/types/catalog';

/**
 * Catalogue actions used by the interactive listing.
 *
 * The listing still renders its first page on the server; these only serve
 * what happens after a shopper interacts — scrolling past the fold, or opening
 * a quick view. Every input arrives from the browser, so each one is parsed
 * against a schema before it reaches a query.
 */

const listingQuerySchema = z.object({
  categoryPath: z.string().max(200).optional(),
  q: z.string().max(120).optional(),
  sizes: z.array(z.string().max(40)).max(20).default([]),
  colors: z.array(z.string().max(40)).max(20).default([]),
  // Minor units. The URL carries whole currency units, but the listing has
  // already converted by the time it hands the query to this action, and
  // `listProducts` works in minor units throughout.
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popular']).default('newest'),
  inStockOnly: z.boolean().default(false),
  page: z.number().int().min(1).max(10_000),
});

export type ListingQuery = z.input<typeof listingQuerySchema>;

export type LoadMoreResult = {
  items: ProductCardData[];
  wishlistProductIds: string[];
  page: number;
  totalPages: number;
  hasNext: boolean;
};

/**
 * The next page of cards for infinite scroll.
 *
 * Rate limited on the same policy as search: a scroll listener is trivially
 * scriptable into a catalogue scrape, and this is the cheapest endpoint to
 * abuse on the site.
 */
export async function loadMoreProductsAction(
  input: unknown,
): Promise<ActionResult<LoadMoreResult>> {
  return run(async () => {
    const query = listingQuerySchema.parse(input);
    await enforceRateLimit('listing:more', rateLimits.search.limit, rateLimits.search.windowMs);

    const [result, wishlistProductIds] = await Promise.all([
      listProducts(query),
      getWishlistProductIds(),
    ]);

    return {
      items: result.items,
      // Serialised across the RSC boundary, so a plain array rather than a Set.
      wishlistProductIds: [...wishlistProductIds],
      page: result.page,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
    };
  });
}

const slugSchema = z.object({ slug: z.string().min(1).max(200) });

/**
 * Just enough of a product to fill the quick-view modal.
 *
 * Deliberately not the whole `ProductDetailData`: the description, care notes
 * and SEO fields are never shown here, and shipping them would make every
 * quick view heavier than the page it is trying to save the shopper.
 */
export async function getQuickViewAction(input: unknown): Promise<ActionResult<QuickViewData>> {
  return run(async () => {
    const { slug } = slugSchema.parse(input);
    const product = await getProductBySlug(slug);
    if (!product) {
      const { notFound } = await import('@/server/errors');
      throw notFound('That product is no longer available.');
    }

    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      shortDescription: product.shortDescription,
      currency: product.currency,
      priceRange: product.priceRange,
      compareAtPrice: product.compareAtPrice,
      images: product.images,
      options: product.options,
      variants: product.variants,
      isSoldOut: product.isSoldOut,
      rating: product.rating,
    };
  });
}
