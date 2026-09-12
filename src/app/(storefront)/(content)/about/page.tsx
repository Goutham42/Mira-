import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Our story',
  description:
    'Mira makes a small, considered wardrobe of dresses and separates — cut well, made in small runs, priced honestly.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <article>
      <p className="label-caps">Our story</p>
      <h1 className="mt-3 text-4xl">Fewer pieces, made properly</h1>

      <div className="mt-8 space-y-5 leading-relaxed text-muted-foreground">
        <p>
          {siteConfig.name} started from a simple frustration: it is surprisingly hard to
          buy a dress that is cut well, made from a fabric that improves with wear, and
          priced at what it actually costs to make.
        </p>
        <p>
          So we make a small number of pieces and make them carefully. Every style is
          patterned in-house, sampled on real bodies across the full size range, and
          produced in runs small enough that nothing sits in a warehouse for a season.
        </p>
        <p>
          We work in natural fibres — washed European linen, organic cotton poplin,
          washable mulberry silk — because they age well. A dress you still reach for in
          five years is the only kind worth making.
        </p>
      </div>

      <section className="mt-14 grid gap-8 border-t pt-10 sm:grid-cols-3">
        <div>
          <h2 className="font-display text-xl">Small runs</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We make what we expect to sell, not what fills a container. Less waste, and
            styles we can actually stand behind.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Honest sizing</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every style is fitted across the range, not graded up from a single sample.
            Our size guide lists real body measurements.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Natural fibres</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Linen, cotton and silk, chosen because they soften and last rather than
            because they are cheap to cut.
          </p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Shop the collection</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Get in touch</Link>
        </Button>
      </div>
    </article>
  );
}
