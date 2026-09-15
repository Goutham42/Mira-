import Link from 'next/link';

import { garmentIcons } from '@/components/brand/garment-icons';
import { categoryRail } from '@/config/home';

/**
 * The mint band of circular category shortcuts.
 *
 * Links point at catalogue paths; a category that does not exist yet still
 * renders here and resolves to the shop's not-found handling, so the rail
 * never depends on the catalogue being seeded.
 */
export function CategoryRail() {
  return (
    <section aria-label="Shop by category" className="bg-mint">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-12">
          <ul className="grid flex-1 grid-cols-3 gap-y-8 sm:grid-cols-6">
            {categoryRail.map((item) => {
              const Icon = garmentIcons[item.key];
              return (
                <li key={item.key} className="flex justify-center">
                  <Link href={item.href} className="group flex flex-col items-center gap-3">
                    <span className="grid size-16 place-items-center rounded-full bg-white/55 text-primary transition-colors duration-300 group-hover:bg-white sm:size-18">
                      <Icon className="size-8 sm:size-9" />
                    </span>
                    <span className="text-center text-sm text-foreground/85 transition-colors group-hover:text-primary">
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div aria-hidden className="hidden w-px self-stretch bg-primary/15 lg:block" />

          <div className="lg:w-48 lg:shrink-0">
            <h2 className="font-display text-3xl leading-[1.15] text-foreground">
              Every
              <br />
              Essential
              <br />
              You Need
            </h2>
            <span aria-hidden className="mt-4 block h-px w-14 bg-foreground/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
