import type { Metadata } from 'next';

import {
  ProductListing,
  type StorefrontSearchParams,
} from '@/components/commerce/product-listing';
import { headlines } from '@/config/site';

export const metadata: Metadata = {
  title: headlines.shop.title,
  description: headlines.shop.description,
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
      heading={headlines.shop.title}
      description={headlines.shop.description}
    />
  );
}
