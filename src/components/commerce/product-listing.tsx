import { Suspense } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { listProducts, getCatalogFacets } from '@/server/services/product.service';
import { getWishlistProductIds } from '@/server/services/wishlist.service';
import { FilterPanel } from './filter-panel';
import { MobileFilters } from './mobile-filters';
import { Pagination } from './pagination';
import { ProductGrid, ProductGridSkeleton } from './product-grid';
import { SortSelect } from './sort-select';

export type StorefrontSearchParams = Record<string, string | string[] | undefined>;

const SORTS = new Set(['newest', 'price-asc', 'price-desc', 'popular']);

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function asNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
}

/**
 * Parse the URL into query parameters.
 *
 * Everything here arrives from the address bar, so nothing is trusted: sort is
 * checked against a whitelist, numbers are bounded, and the service applies its
 * own page-size cap on top.
 */
function parseSearchParams(searchParams: StorefrontSearchParams) {
  const rawSort = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;
  const sort = rawSort && SORTS.has(rawSort) ? rawSort : 'newest';

  return {
    sizes: asArray(searchParams.size),
    colors: asArray(searchParams.color),
    minPrice: asNumber(searchParams.minPrice),
    maxPrice: asNumber(searchParams.maxPrice),
    q: (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.slice(0, 120),
    sort: sort as 'newest' | 'price-asc' | 'price-desc' | 'popular',
    page: asNumber(searchParams.page) ?? 1,
  };
}

async function Results({
  categoryPath,
  searchParams,
  basePath,
}: {
  categoryPath?: string;
  searchParams: StorefrontSearchParams;
  basePath: string;
}) {
  const params = parseSearchParams(searchParams);

  const [result, wishlistIds] = await Promise.all([
    listProducts({ ...params, categoryPath }),
    getWishlistProductIds(),
  ]);

  if (result.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-xl">Nothing matches those filters</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try removing a filter, or browse the full collection.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {result.total} product{result.total === 1 ? '' : 's'} found
      </p>

      <ProductGrid products={result.items} wishlistProductIds={wishlistIds} />

      <div className="mt-14">
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          searchParams={searchParams}
          basePath={basePath}
        />
      </div>
    </>
  );
}

/**
 * Shared product listing, used by /shop, /c/[...slug] and /search.
 *
 * Filters and sort are read from the URL, so this whole subtree renders on the
 * server and the browser downloads no listing logic.
 */
export async function ProductListing({
  categoryPath,
  searchParams,
  basePath,
  heading,
  description,
}: {
  categoryPath?: string;
  searchParams: StorefrontSearchParams;
  basePath: string;
  heading: string;
  description?: string | null;
}) {
  const facets = await getCatalogFacets(categoryPath);
  const params = parseSearchParams(searchParams);

  // Re-render the results subtree whenever the query changes.
  const resultsKey = JSON.stringify(searchParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl">{heading}</h1>
        {description ? (
          <p className="mt-3 text-muted-foreground">{description}</p>
        ) : null}
      </header>

      <div className="mt-10 flex items-center justify-between gap-4 border-b pb-4">
        <MobileFilters facets={facets}>
          <span className="inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2 text-sm lg:hidden">
            <SlidersHorizontal className="size-4" />
            Filters
          </span>
        </MobileFilters>

        <div className="ml-auto">
          <SortSelect value={params.sort} />
        </div>
      </div>

      <div className="mt-8 flex gap-10">
        <aside className="hidden w-56 shrink-0 lg:block">
          <FilterPanel facets={facets} />
        </aside>

        <div className="min-w-0 flex-1">
          <Suspense key={resultsKey} fallback={<ProductGridSkeleton count={8} />}>
            <Results
              categoryPath={categoryPath}
              searchParams={searchParams}
              basePath={basePath}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
