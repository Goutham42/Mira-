import type { Metadata } from 'next';

import {
  ProductListing,
  type StorefrontSearchParams,
} from '@/components/commerce/product-listing';
import { SearchInput } from '@/components/commerce/search-input';

export const metadata: Metadata = {
  title: 'Search',
  // A search results page has nothing durable to index.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<StorefrontSearchParams>;
}) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q) ?? '';

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <SearchInput initialQuery={query} />
      </div>

      {query ? (
        <ProductListing
          searchParams={params}
          basePath="/search"
          heading={`Results for "${query}"`}
        />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            Search for a piece by name, fabric or colour.
          </p>
        </div>
      )}
    </div>
  );
}
