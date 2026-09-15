import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ImageSlot } from '@/components/ui/image-slot';
import { collectionPromo, featuredCollections } from '@/config/home';
import { resolveCategoryHref } from '@/lib/category-href';
import { getCategoryTree } from '@/server/services/category.service';

export async function FeaturedCollections() {
  const categories = await getCategoryTree();

  return (
    <section className="reveal mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-4xl sm:text-[2.75rem]">Featured Collections</h2>
        <Link
          href="/shop"
          className="group link-sweep inline-flex shrink-0 items-center gap-2 pb-1 text-sm text-foreground/80 transition-colors duration-200 hover:text-primary"
        >
          View All
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.6}
            aria-hidden
          />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.65fr]">
        {featuredCollections.map((collection) => (
          <Link
            key={collection.name}
            href={resolveCategoryHref(categories, collection.name)}
            className="hover-lift group flex flex-col overflow-hidden rounded-lg border border-border/70 bg-surface hover:border-primary/30"
          >
            <ImageSlot
              src={collection.image}
              alt={collection.alt}
              label={collection.name}
              ratio="3:4 · 900×1200"
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 50vw, 100vw"
              className="aspect-[3/4] w-full"
              imageClassName="media-zoom"
            />
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <p className="text-[0.9375rem] text-foreground transition-colors duration-200 group-hover:text-primary">
                  {collection.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{collection.caption}</p>
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-foreground/70 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:text-primary"
                strokeWidth={1.6}
                aria-hidden
              />
            </div>
          </Link>
        ))}

        {/* Editorial promo — spans the full row on small screens so the three
            collection cards keep their 3:4 crop rather than being squeezed. */}
        <div className="hover-lift group grid overflow-hidden rounded-lg border border-border/70 bg-gradient-to-br from-surface-muted via-surface-muted to-accent-soft/40 sm:col-span-2 lg:col-span-1 lg:grid-cols-[0.45fr_1fr]">
          <ImageSlot
            src={collectionPromo.image}
            alt={collectionPromo.alt}
            label="Folded fabrics"
            ratio="3:4"
            sizes="(min-width: 1024px) 14vw, 100vw"
            className="min-h-40 w-full lg:min-h-full"
          />
          <div className="flex flex-col justify-center gap-6 px-7 py-9">
            <p className="font-display text-2xl leading-snug text-foreground xl:text-[1.75rem]">
              {collectionPromo.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <Link
              href={collectionPromo.cta.href}
              className="btn-pill inline-flex w-fit items-center gap-3 rounded-full bg-ink py-2.5 pl-6 pr-2.5 text-sm text-ink-foreground shadow-xs hover:bg-ink/90"
            >
              {collectionPromo.cta.label}
              <span className="btn-arrow grid size-7 place-items-center rounded-full bg-white/15">
                <ArrowRight className="size-3.5" strokeWidth={1.8} aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
