'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';
import type { CatalogFacets } from '@/types/catalog';

/**
 * Catalogue filters.
 *
 * State lives entirely in the URL, never in React state. That gives back-button
 * correctness, shareable filtered links and server-rendered results for free —
 * and it is why the results grid can stay a Server Component.
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

  const selected = useCallback(
    (key: string) => new Set(searchParams.getAll(key)),
    [searchParams],
  );

  const toggle = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(key);

      params.delete(key);
      for (const existing of current) {
        if (existing !== value) params.append(key, existing);
      }
      if (!current.includes(value)) params.append(key, value);

      // Any filter change invalidates the current page number.
      params.delete('page');

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      onNavigate?.();
    },
    [onNavigate, pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['size', 'color', 'minPrice', 'maxPrice', 'page']) {
      params.delete(key);
    }
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
    onNavigate?.();
  }, [onNavigate, pathname, router, searchParams]);

  const selectedSizes = selected('size');
  const selectedColors = selected('color');
  const hasFilters = selectedSizes.size > 0 || selectedColors.size > 0;

  return (
    <div className="space-y-8">
      {hasFilters ? (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Clear all filters
        </button>
      ) : null}

      {facets.sizes.length > 0 ? (
        <fieldset>
          <legend className="label-caps mb-3">Size</legend>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => {
              const active = selectedSizes.has(size.value);
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => toggle('size', size.value)}
                  aria-pressed={active}
                  className={cn(
                    'min-w-11 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-border-strong',
                  )}
                >
                  {size.value}
                </button>
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
                <button
                  key={color.value}
                  type="button"
                  onClick={() => toggle('color', color.value)}
                  aria-pressed={active}
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
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {facets.priceRange.max > facets.priceRange.min ? (
        <div>
          <p className="label-caps mb-2">Price</p>
          <p className="text-sm text-muted-foreground">
            {formatMoney(facets.priceRange.min, currency, siteConfig.locale)} –{' '}
            {formatMoney(facets.priceRange.max, currency, siteConfig.locale)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
