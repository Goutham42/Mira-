import Link from 'next/link';

import { garmentIcons } from '@/components/brand/garment-icons';
import { categoryRail } from '@/config/home';
import { resolveCategoryHref } from '@/lib/category-href';
import { getCategoryTree } from '@/server/services/category.service';

/**
 * The mint band of circular category shortcuts.
 *
 * Each tile resolves against the real category tree, falling back to a search
 * when the shop has not created that category yet — the design keeps all six
 * icons either way, and none of them can 404.
 */
export async function CategoryRail() {
  const categories = await getCategoryTree();
  return (
    <section
      aria-label="Shop by category"
      className="relative overflow-hidden bg-mint"
    >
      {/* Soft light from the top-left keeps the flat mint band from reading
          like a solid colour block between two cream sections. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_0%,rgb(255_255_255/0.75),transparent_60%)]"
      />
      <div className="relative">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-12">
          <ul className="grid flex-1 grid-cols-3 gap-y-8 sm:grid-cols-6">
            {categoryRail.map((item) => {
              const Icon = garmentIcons[item.key];
              return (
                <li key={item.key} className="flex justify-center">
                  <Link
                    href={resolveCategoryHref(categories, item.name, item.key)}
                    className="group flex flex-col items-center gap-3"
                  >
                    <span className="grid size-16 place-items-center rounded-full bg-white/60 text-primary shadow-xs transition-all duration-300 ease-[var(--ease-soft)] group-hover:-translate-y-1 group-hover:bg-white group-hover:shadow-md sm:size-18">
                      <Icon className="size-8 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 sm:size-9" />
                    </span>
                    <span className="text-center text-sm text-foreground/85 transition-colors duration-200 group-hover:text-primary">
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
      </div>
    </section>
  );
}
