import { AboutStrip } from '@/components/home/about-strip';
import { CategoryRail } from '@/components/home/category-rail';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { Hero } from '@/components/home/hero';
import { InstagramStrip } from '@/components/home/instagram-strip';
import { WhyChoose } from '@/components/home/why-choose';

/**
 * Homepage.
 *
 * A brand page rather than a catalogue page: every section is editorial and
 * reads its copy from `@/config/home`, so nothing here blocks on the database
 * and the whole page paints as soon as the header resolves.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryRail />
      <FeaturedCollections />
      <WhyChoose />
      <AboutStrip />
      <InstagramStrip />
    </>
  );
}
