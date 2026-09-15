import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { headlines, siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: headlines.about.title,
  description: siteConfig.description,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <article>
      <p className="label-wide text-muted-foreground">{headlines.about.kicker}</p>
      <h1 className="mt-3 text-4xl">{headlines.about.title}</h1>

      <div className="mt-8 space-y-5 leading-relaxed text-muted-foreground">
        <p>
          {siteConfig.name} began the way most good shops do — with customers asking for
          something the market kept getting wrong. Ethnic wear was either dressed up for
          occasions nobody has every week, or cheap enough to fall apart by the third
          wash. Very little of it was made for an ordinary Tuesday.
        </p>
        <p>
          So we built the wardrobe around the days you actually have. Kurtis you can wear
          to work and still be comfortable in at eight in the evening. Salwar sets that
          hold their colour. Leggings, inners and inskirts that fit properly, because the
          pieces nobody sees are the ones that decide how the rest sits.
        </p>
        <p>
          Everything is chosen for how it behaves after a month, not how it looks on a
          hanger. We would rather sell you one kurti you keep reaching for than four you
          tolerate.
        </p>
      </div>

      <section className="mt-14 grid gap-8 border-t pt-10 sm:grid-cols-3">
        <div>
          <h2 className="font-display text-xl">Fabric that lasts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Breathable cotton and cotton blends picked for Indian weather — they soften
            with washing instead of thinning out.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Honest sizing</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Our size guide lists real body measurements, not vanity labels, so you can
            order once and keep it.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">A real shop</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You can find us in {siteConfig.store.locality}. Come and feel the fabric
            before you buy — or message us and we will send you a closer look.
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
