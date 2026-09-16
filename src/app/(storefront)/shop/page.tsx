import type { Metadata } from 'next';

import {
  ProductListing,
  type StorefrontSearchParams,
} from '@/components/commerce/product-listing';
import { headlines } from '@/config/site';
import { listingMetadata } from '@/lib/listing-metadata';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<StorefrontSearchParams>;
}): Promise<Metadata> {
  return listingMetadata({
    basePath: '/shop',
    searchParams: await searchParams,
    title: headlines.shop.title,
    description: headlines.shop.description,
  });
}

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
      heading={headlines.shop.title}
      description={headlines.shop.description}
    />
  );
}
