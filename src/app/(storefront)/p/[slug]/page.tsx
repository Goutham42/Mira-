import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ProductViewer } from '@/components/commerce/product-viewer';
import { ProductGrid } from '@/components/commerce/product-grid';
import { ReviewSection } from '@/components/commerce/review-section';
import { getProductBySlug, getRelatedProducts } from '@/server/services/product.service';
import { getWishlistProductIds } from '@/server/services/wishlist.service';
import { siteConfig } from '@/config/site';
import { env } from '@/config/env';
import { toMajorUnits } from '@/lib/money';
import { truncate } from '@/lib/utils';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found' };

  const description =
    product.seoDescription ??
    product.shortDescription ??
    truncate(product.description ?? siteConfig.description, 160);

  return {
    title: product.seoTitle ?? product.title,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, wishlistIds] = await Promise.all([
    getRelatedProducts(product.id, product.category?.id ?? null, 4),
    getWishlistProductIds(),
  ]);

  /**
   * Product structured data. Google needs offers priced in major units, so this
   * is the one place a decimal representation of money is correct.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map((image) => image.url),
    sku: product.variants[0]?.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: product.currency,
      lowPrice: toMajorUnits(product.priceRange.min, product.currency),
      highPrice: toMajorUnits(product.priceRange.max, product.currency),
      offerCount: product.variants.length,
      availability: product.isSoldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating.average.toFixed(1),
          reviewCount: product.rating.count,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised from our own database values, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {product.breadcrumbs.map((crumb, index) => (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            <span className="text-foreground">{product.title}</span>
          </li>
        </ol>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProductViewer
          product={product}
          inWishlist={wishlistIds.has(product.id)}
          freeShippingThreshold={env.FREE_SHIPPING_THRESHOLD_MINOR}
        />

        {product.description || product.material || product.careInstructions ? (
          <section className="mt-20 grid gap-10 border-t pt-12 md:grid-cols-2 lg:gap-16">
            {product.description ? (
              <div>
                <h2 className="text-2xl">Details</h2>
                <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </div>
              </div>
            ) : null}

            <dl className="space-y-6 text-sm">
              {product.material ? (
                <div>
                  <dt className="label-caps">Fabric</dt>
                  <dd className="mt-1.5 text-muted-foreground">{product.material}</dd>
                </div>
              ) : null}
              {product.careInstructions ? (
                <div>
                  <dt className="label-caps">Care</dt>
                  <dd className="mt-1.5 text-muted-foreground">{product.careInstructions}</dd>
                </div>
              ) : null}
              {product.brand ? (
                <div>
                  <dt className="label-caps">Brand</dt>
                  <dd className="mt-1.5 text-muted-foreground">{product.brand}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {/* Reviews stream in separately: the summary, list and eligibility check
            are three queries the buying surface above should not wait on. */}
        <Suspense fallback={null}>
          <ReviewSection productId={product.id} productSlug={product.slug} />
        </Suspense>

        {related.length > 0 ? (
          <section className="mt-20 border-t pt-12">
            <h2 className="text-2xl">You may also like</h2>
            <ProductGrid products={related} wishlistProductIds={wishlistIds} className="mt-8" />
          </section>
        ) : null}
      </div>
    </>
  );
}
