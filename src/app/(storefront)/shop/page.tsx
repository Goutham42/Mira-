import type { Metadata } from 'next';

import {
  ProductListing,
  type StorefrontSearchParams,
} from '@/components/commerce/product-listing';

export const metadata: Metadata = {
  title: 'Shop all',
  description: 'Every piece in the Mira collection — dresses, tops and bottoms.',
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<StorefrontSearchParams>;
}) {
  const params = await searchParams;

  return (
    <ProductListing
      searchParams={params}
      basePath="/shop"
      heading="Shop all"
      description="Every piece in the collection, in one place."
    />
  );
}
