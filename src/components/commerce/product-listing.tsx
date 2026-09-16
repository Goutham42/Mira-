import { Suspense } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { listProducts, getCatalogFacets } from '@/server/services/product.service';
import { getWishlistProductIds } from '@/server/services/wishlist.service';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { toMinorUnits } from '@/lib/money';
import { siteConfig } from '@/config/site';
import { ActiveFilters } from './active-filters';
import { SearchSuggestions } from './search-suggestions';
import { FilterPanel } from './filter-panel';
import { MobileFilters } from './mobile-filters';
import { Pagination } from './pagination';
import { ProductGridSkeleton } from './product-grid';
import { CollectionGrid } from './collection-grid';
import { LayoutControls } from './layout-controls';
import { ListingPreferencesProvider } from './listing-preferences';
import { SortSelect } from './sort-select';

export type StorefrontSearchParams = Record<string, string | string[] | undefined>;

const SORTS = new Set(['newest', 'price-asc', 'price-desc', 'popular']);

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toMinor(major: number | undefined): number | undefined {
  return major === undefined ? undefined : toMinorUnits(major, siteConfig.currency);
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
    // The URL carries whole currency units (`?minPrice=2000` is ₹2,000) so a
    // no-JS form submit lands on a correct URL and shared links stay readable.
    // The catalogue query works in minor units, so convert on the way in.
    minPrice: toMinor(asNumber(searchParams.minPrice)),
    maxPrice: toMinor(asNumber(searchParams.maxPrice)),
    q: (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.slice(0, 120),
    sort: sort as 'newest' | 'price-asc' | 'price-desc' | 'popular',
    // Presence with the value "1" is the switch, so the URL stays short and an
    // unchecked box leaves no trace in the address bar.
    inStockOnly: firstOf(searchParams.inStock) === '1',
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
      <div className="py-16">
        <p className="font-display text-2xl">Nothing matches that</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try removing a filter, or start from one of these.
        </p>
        <div className="mt-8">
          <SearchSuggestions heading="Try instead" />
        </div>
      </div>
    );
  }

  // Everything the load-more action needs to continue this exact query. `page`
  // is left out because the grid advances it itself.
  const { page: _page, ...query } = params;

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground" aria-live="polite">
        {result.total} product{result.total === 1 ? '' : 's'}
      </p>

      <CollectionGrid
        initialItems={result.items}
        initialWishlistIds={[...wishlistIds]}
        query={{ ...query, categoryPath }}
        initialPage={result.page}
        totalPages={result.totalPages}
        total={result.total}
        paginationFallback={
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            searchParams={searchParams}
            basePath={basePath}
          />
        }
      />
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
    <ListingPreferencesProvider>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl">{heading}</h1>
        {description ? (
          <p className="mt-3 text-muted-foreground">{description}</p>
        ) : null}
      </header>

      {/*
        Pinned below the site header (h-18 / lg:h-20) so filters and sort stay
        reachable deep into an infinitely scrolling grid — which is exactly
        where a shopper is most likely to want to narrow down.
      */}
      <div className="sticky top-18 z-30 -mx-4 mt-10 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-20 lg:-mx-8 lg:px-8">
        <MobileFilters facets={facets}>
          <span className="inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2 text-sm lg:hidden">
            <SlidersHorizontal className="size-4" />
            Filters
          </span>
        </MobileFilters>

        <div className="ml-auto flex items-center gap-3">
          <LayoutControls />
          <SortSelect value={params.sort} />
        </div>
      </div>

      <div className="mt-5 empty:mt-0">
        <ActiveFilters />
      </div>

      <div className="mt-8 flex gap-10">
        <aside aria-label="Filters" className="hidden w-56 shrink-0 lg:block">
          <FilterPanel facets={facets} />
        </aside>

        <div className="min-w-0 flex-1">
          {/*
            The skeleton must hold as many cards as a full page, or every
            filter change paints a short grid and then reflows to a tall one.
          */}
          <Suspense key={resultsKey} fallback={<ProductGridSkeleton count={DEFAULT_PAGE_SIZE} />}>
            <Results
              categoryPath={categoryPath}
              searchParams={searchParams}
              basePath={basePath}
            />
          </Suspense>
        </div>
      </div>
      </div>
    </ListingPreferencesProvider>
  );
}
