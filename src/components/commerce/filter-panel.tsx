'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatMoney, toMajorUnits } from '@/lib/money';
import { siteConfig } from '@/config/site';
import type { CatalogFacets } from '@/types/catalog';

/**
 * Catalogue filters.
 *
 * State lives entirely in the URL, never in React state. That gives back-button
 * correctness, shareable filtered links and server-rendered results for free —
 * and it is why the results grid can stay a Server Component.
 *
 * Every control is a real link or a real GET form, so the panel works with
 * JavaScript disabled or still loading. With JavaScript the clicks are
 * intercepted and pushed through a transition instead, which is what lets the
 * panel dim and the results skeleton appear rather than the page hanging.
 *
 * Filter links carry `rel="nofollow"`: they are genuine URLs now, and without
 * it a crawler would walk the whole combinatorial space of size x colour x
 * price. The canonical tags in `listing-metadata.ts` handle what still gets
 * through.
 */
export function FilterPanel({
  facets,
  currency = siteConfig.currency,
  onNavigate,
}: {
  facets: CatalogFacets;
  currency?: string;
  /** Lets the mobile sheet close itself after a selection. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /** Apply a mutation to the current query and return the resulting URL. */
  const hrefFor = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any filter change invalidates the current page number.
      params.delete('page');
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => router.push(href, { scroll: false }));
      onNavigate?.();
    },
    [onNavigate, router],
  );

  const toggleHref = useCallback(
    (key: string, value: string) =>
      hrefFor((params) => {
        const current = params.getAll(key);
        params.delete(key);
        for (const existing of current) {
          if (existing !== value) params.append(key, existing);
        }
        if (!current.includes(value)) params.append(key, value);
      }),
    [hrefFor],
  );

  const selected = useCallback(
    (key: string) => new Set(searchParams.getAll(key)),
    [searchParams],
  );

  const selectedSizes = selected('size');
  const selectedColors = selected('color');
  const inStockOnly = searchParams.get('inStock') === '1';

  const hasFilters =
    selectedSizes.size > 0 ||
    selectedColors.size > 0 ||
    inStockOnly ||
    searchParams.has('minPrice') ||
    searchParams.has('maxPrice');

  const clearAllHref = hrefFor((params) => {
    for (const key of ['size', 'color', 'minPrice', 'maxPrice', 'inStock']) {
      params.delete(key);
    }
  });

  const inStockHref = hrefFor((params) => {
    if (inStockOnly) params.delete('inStock');
    else params.set('inStock', '1');
  });

  return (
    <div
      className={cn('space-y-8 transition-opacity', isPending && 'opacity-60')}
      aria-busy={isPending || undefined}
    >
      {hasFilters ? (
        <FilterLink
          href={clearAllHref}
          onNavigate={navigate}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Clear all filters
        </FilterLink>
      ) : null}

      <fieldset>
        <legend className="label-caps mb-3">Availability</legend>
        <FilterLink
          href={inStockHref}
          onNavigate={navigate}
          aria-label={inStockOnly ? 'Show all products' : 'Show in-stock products only'}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
            inStockOnly ? 'bg-surface-muted font-medium' : 'hover:bg-surface-muted/60',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded border',
              inStockOnly ? 'border-foreground bg-foreground text-background' : 'border-border',
            )}
          >
            {inStockOnly ? '✓' : null}
          </span>
          In stock only
        </FilterLink>
      </fieldset>

      {facets.sizes.length > 0 ? (
        <fieldset>
          <legend className="label-caps mb-3">Size</legend>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => {
              const active = selectedSizes.has(size.value);
              return (
                <FilterLink
                  key={size.value}
                  href={toggleHref('size', size.value)}
                  onNavigate={navigate}
                  // The visible count is decorative shorthand; spell the whole
                  // thing out rather than leaving a reader to parse "M 6".
                  aria-label={`${active ? 'Remove' : 'Apply'} size ${size.value} filter — ${size.count} product${size.count === 1 ? '' : 's'}`}
                  className={cn(
                    'min-w-11 rounded-md border px-3 py-1.5 text-center text-sm transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-border-strong',
                  )}
                >
                  {size.value}
                  <span
                    aria-hidden
                    className={cn(
                      'ml-1.5 text-[0.6875rem] tabular-nums',
                      active ? 'text-background/60' : 'text-subtle-foreground',
                    )}
                  >
                    {size.count}
                  </span>
                </FilterLink>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {facets.colors.length > 0 ? (
        <fieldset>
          <legend className="label-caps mb-3">Colour</legend>
          <div className="space-y-1">
            {facets.colors.map((color) => {
              const active = selectedColors.has(color.value);
              return (
                <FilterLink
                  key={color.value}
                  href={toggleHref('color', color.value)}
                  onNavigate={navigate}
                  aria-label={`${active ? 'Remove' : 'Apply'} colour ${color.value} filter — ${color.count} product${color.count === 1 ? '' : 's'}`}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    active ? 'bg-surface-muted font-medium' : 'hover:bg-surface-muted/60',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 rounded-full border',
                      active && 'ring-1 ring-foreground ring-offset-1 ring-offset-background',
                    )}
                    style={{ backgroundColor: color.hexColor ?? 'transparent' }}
                  />
                  {color.value}
                  <span aria-hidden className="ml-auto text-xs tabular-nums text-subtle-foreground">
                    {color.count}
                  </span>
                </FilterLink>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {facets.priceRange.max > facets.priceRange.min ? (
        <PriceFilter
          facets={facets}
          currency={currency}
          action={pathname}
          hiddenParams={searchParams}
          onApply={navigate}
          hrefFor={hrefFor}
          initialMin={searchParams.get('minPrice') ?? ''}
          initialMax={searchParams.get('maxPrice') ?? ''}
        />
      ) : null}
    </div>
  );
}

/**
 * An anchor that navigates client-side when it can.
 *
 * The `href` is always real, so the control still works when the click handler
 * never runs. Modified clicks (new tab, new window, download) are left alone.
 */
function FilterLink({
  href,
  onNavigate,
  className,
  children,
  ...rest
}: {
  href: string;
  onNavigate: (href: string) => void;
  className?: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  return (
    <a
      href={href}
      rel="nofollow"
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        onNavigate(href);
      }}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}

/**
 * Min/max price inputs.
 *
 * The URL carries whole currency units — `?minPrice=2000` is two thousand
 * rupees, not two thousand paise. That is what the shopper types, so a plain
 * GET submit without JavaScript lands on a correct URL with no conversion
 * step; the listing converts to minor units server-side. It also makes a
 * shared filtered link readable.
 */
function PriceFilter({
  facets,
  currency,
  action,
  hiddenParams,
  onApply,
  hrefFor,
  initialMin,
  initialMax,
}: {
  facets: CatalogFacets;
  currency: string;
  action: string;
  hiddenParams: URLSearchParams;
  onApply: (href: string) => void;
  hrefFor: (mutate: (params: URLSearchParams) => void) => string;
  initialMin: string;
  initialMax: string;
}) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);

  // Keep the boxes honest when a chip elsewhere clears the price.
  useEffect(() => {
    setMin(initialMin);
    setMax(initialMax);
  }, [initialMin, initialMax]);

  const bounds = {
    min: Math.floor(toMajorUnits(facets.priceRange.min, currency)),
    max: Math.ceil(toMajorUnits(facets.priceRange.max, currency)),
  };

  // Everything except price and page has to ride along, or a no-JS submit
  // would silently drop the shopper's other selections.
  const carried: { key: string; value: string }[] = [];
  for (const [key, value] of hiddenParams.entries()) {
    if (key === 'minPrice' || key === 'maxPrice' || key === 'page') continue;
    carried.push({ key, value });
  }

  return (
    <form
      method="get"
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        onApply(
          hrefFor((params) => {
            params.delete('minPrice');
            params.delete('maxPrice');
            if (min.trim()) params.set('minPrice', String(Math.max(0, Math.trunc(Number(min)))));
            if (max.trim()) params.set('maxPrice', String(Math.max(0, Math.trunc(Number(max)))));
          }),
        );
      }}
    >
      {carried.map(({ key, value }, index) => (
        <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
      ))}

      <p className="label-caps mb-2">Price</p>
      <p className="mb-3 text-xs text-muted-foreground">
        {formatMoney(facets.priceRange.min, currency, siteConfig.locale)} –{' '}
        {formatMoney(facets.priceRange.max, currency, siteConfig.locale)}
      </p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          // `inputMode` gives the numeric keypad on a phone without the spinner
          // buttons and scroll-to-change behaviour of `type="number"`.
          inputMode="decimal"
          pattern="[0-9]*"
          name="minPrice"
          value={min}
          onChange={(event) => setMin(event.target.value)}
          aria-label="Minimum price"
          placeholder={String(bounds.min)}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2.5 text-sm placeholder:text-subtle-foreground"
        />
        <span aria-hidden className="text-xs text-subtle-foreground">
          to
        </span>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          name="maxPrice"
          value={max}
          onChange={(event) => setMax(event.target.value)}
          aria-label="Maximum price"
          placeholder={String(bounds.max)}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2.5 text-sm placeholder:text-subtle-foreground"
        />
      </div>

      <button
        type="submit"
        className="mt-2.5 w-full rounded-md border border-border-strong py-1.5 text-xs transition-colors hover:bg-surface-muted"
      >
        Apply
      </button>
    </form>
  );
}
