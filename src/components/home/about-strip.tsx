import Link from 'next/link';
import { ArrowRight, MapPin, ShieldCheck, Tag, Truck } from 'lucide-react';

import { ImageSlot } from '@/components/ui/image-slot';
import { aboutSection, assurances } from '@/config/home';
import { siteConfig } from '@/config/site';

const icons = { truck: Truck, shield: ShieldCheck, tag: Tag, pin: MapPin } as const;

export function AboutStrip() {
  return (
    <section className="bg-surface-muted/70">
      {/* Full-bleed on purpose: the photograph runs to the left edge of the
          viewport, and only the copy is held to the container gutter. */}
      <div className="grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
        <ImageSlot
          src={aboutSection.image}
          alt={aboutSection.alt}
          label="About — portrait"
          ratio="4:5 · 1000×1250"
          sizes="(min-width: 1024px) 42vw, 100vw"
          className="min-h-72 w-full lg:min-h-[28rem]"
        />

        <div className="grid gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-14 lg:px-14 lg:py-16">
          <div className="max-w-md">
            <p className="label-wide text-muted-foreground">
              {aboutSection.kicker} {siteConfig.name}
            </p>
            <h2 className="mt-4 font-display text-4xl leading-[1.1]">
              {aboutSection.title[0]}
              <br />
              {aboutSection.title[1]}
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              At {siteConfig.name}, {aboutSection.body}
            </p>
            <Link
              href={aboutSection.cta.href}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-primary py-2.5 pl-6 pr-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {aboutSection.cta.label}
              <span className="grid size-7 place-items-center rounded-full bg-white/15">
                <ArrowRight className="size-3.5" strokeWidth={1.8} aria-hidden />
              </span>
            </Link>
          </div>

          <ul className="space-y-6 lg:w-72 lg:border-l lg:border-border/70 lg:pl-12">
            {assurances.map((item) => {
              const Icon = icons[item.icon];
              return (
                <li key={item.title} className="flex items-start gap-4">
                  <Icon
                    className="mt-0.5 size-6 shrink-0 text-foreground"
                    strokeWidth={1.3}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
