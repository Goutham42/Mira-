import { Suspense } from 'react';

import { AboutStrip } from '@/components/home/about-strip';
import { CategoryRail } from '@/components/home/category-rail';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { Hero } from '@/components/home/hero';
import { ProductGridSkeleton } from '@/components/commerce/product-grid';
import { InstagramStrip } from '@/components/home/instagram-strip';
import { NewArrivals } from '@/components/home/new-arrivals';
import { WhyChoose } from '@/components/home/why-choose';

/**
 * Homepage.
 *
 * Mostly a brand page: the editorial sections read their copy from
 * `@/config/home` and block on nothing. The one catalogue section streams in
 * behind a Suspense boundary, so a slow product query never delays the hero.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryRail />
      <FeaturedCollections />

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <ProductGridSkeleton count={4} />
          </div>
        }
      >
        <NewArrivals />
      </Suspense>

      <WhyChoose />
      <AboutStrip />
      <InstagramStrip />
    </>
  );
}
