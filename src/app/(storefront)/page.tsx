import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { ProductGrid, ProductGridSkeleton } from '@/components/commerce/product-grid';
import { getFeaturedProducts, getNewArrivals } from '@/server/services/product.service';
import { getCategoryTree } from '@/server/services/category.service';
import { getWishlistProductIds } from '@/server/services/wishlist.service';
import { siteConfig } from '@/config/site';

async function FeaturedSection() {
  const [products, wishlistIds] = await Promise.all([
    getFeaturedProducts(8),
    getWishlistProductIds(),
  ]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-caps">Chosen by us</p>
          <h2 className="mt-1 text-3xl">Featured pieces</h2>
        </div>
        <Link
          href="/shop"
          className="shrink-0 text-sm underline underline-offset-4 hover:text-accent"
        >
          Shop all
        </Link>
      </div>

      <ProductGrid products={products} wishlistProductIds={wishlistIds} className="mt-8" />
    </section>
  );
}

async function NewArrivalsSection() {
  const [products, wishlistIds] = await Promise.all([
    getNewArrivals(4),
    getWishlistProductIds(),
  ]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-caps">Just landed</p>
          <h2 className="mt-1 text-3xl">New in</h2>
        </div>
        <Link
          href="/shop?sort=newest"
          className="shrink-0 text-sm underline underline-offset-4 hover:text-accent"
        >
          See everything new
        </Link>
      </div>

      <ProductGrid products={products} wishlistProductIds={wishlistIds} className="mt-8" />
    </section>
  );
}

async function CategoryStrip() {
  const categories = await getCategoryTree();
  const featured = categories.slice(0, 3);
  if (featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h2 className="text-3xl">Shop by category</h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {featured.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.path}`}
            className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-muted"
          >
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="font-display text-2xl text-background">{category.name}</p>
              <p className="mt-0.5 text-xs text-background/80">
                {category.productCount} piece{category.productCount === 1 ? '' : 's'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero — text-first so it renders instantly and carries the LCP itself
          rather than waiting on a large image download. */}
      <section className="border-b bg-surface-muted/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28 lg:px-8">
          <div>
            <p className="label-caps">{siteConfig.tagline}</p>
            <h1 className="mt-4 text-5xl leading-[1.05] md:text-6xl">
              Dresses with the
              <br />
              quiet kind of presence
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">
              Considered cuts, natural fabrics and a palette that works together. Made in
              small runs, so nothing sits in a warehouse for a season.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/shop">Shop the collection</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/c/dresses">Browse dresses</Link>
              </Button>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface lg:aspect-[4/5]">
            <div className="flex h-full items-center justify-center px-8 text-center">
              <p className="font-display text-xl text-subtle-foreground">
                Add a hero image in the admin to fill this space.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <FeaturedSection />
      </Suspense>

      <Suspense fallback={null}>
        <CategoryStrip />
      </Suspense>

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <ProductGridSkeleton count={4} />
          </div>
        }
      >
        <NewArrivalsSection />
      </Suspense>
    </>
  );
}
