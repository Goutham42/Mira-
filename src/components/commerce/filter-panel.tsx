'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
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
  // Every filter click is a server round trip; the transition is what lets the
  // panel dim and the results skeleton appear instead of the UI hanging.
  const [isPending, startTransition] = useTransition();

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

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
      onNavigate?.();
    },
    [onNavigate, pathname, router, searchParams],
  );

  /**
   * Price is applied on submit rather than on every keystroke: pushing a route
   * per digit would re-run the product query four times for one number.
   */
  const applyPrice = useCallback(
    (min: string, max: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('minPrice');
      params.delete('maxPrice');
      if (min) params.set('minPrice', min);
      if (max) params.set('maxPrice', max);
      params.delete('page');

      startTransition(() => {
        router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
          scroll: false,
        });
      });
      onNavigate?.();
    },
    [onNavigate, pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['size', 'color', 'minPrice', 'maxPrice', 'page']) {
      params.delete(key);
    }
    startTransition(() => {
      router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      });
    });
    onNavigate?.();
  }, [onNavigate, pathname, router, searchParams]);

  const selectedSizes = selected('size');
  const selectedColors = selected('color');
  const hasFilters =
    selectedSizes.size > 0 ||
    selectedColors.size > 0 ||
    searchParams.has('minPrice') ||
    searchParams.has('maxPrice');

  return (
    <div
      className={cn('space-y-8 transition-opacity', isPending && 'opacity-60')}
      aria-busy={isPending || undefined}
    >
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
        <PriceFilter
          facets={facets}
          currency={currency}
          onApply={applyPrice}
          initialMin={searchParams.get('minPrice') ?? ''}
          initialMax={searchParams.get('maxPrice') ?? ''}
        />
      ) : null}
    </div>
  );
}

/**
 * Min/max price inputs.
 *
 * Amounts are held in major units in the box (what a shopper types) and
 * converted to the minor units the catalogue query expects on submit.
 */
function PriceFilter({
  facets,
  currency,
  onApply,
  initialMin,
  initialMax,
}: {
  facets: CatalogFacets;
  currency: string;
  onApply: (min: string, max: string) => void;
  initialMin: string;
  initialMax: string;
}) {
  const toMajor = (minor: string) => (minor ? String(Math.round(Number(minor) / 100)) : '');

  const [min, setMin] = useState(() => toMajor(initialMin));
  const [max, setMax] = useState(() => toMajor(initialMax));

  // Keep the boxes honest when a chip elsewhere clears the price.
  useEffect(() => {
    setMin(toMajor(initialMin));
    setMax(toMajor(initialMax));
  }, [initialMin, initialMax]);

  const bounds = {
    min: Math.floor(facets.priceRange.min / 100),
    max: Math.ceil(facets.priceRange.max / 100),
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const toMinor = (major: string) =>
          major.trim() ? String(Math.max(0, Math.round(Number(major) * 100))) : '';
        onApply(toMinor(min), toMinor(max));
      }}
    >
      <p className="label-caps mb-2">Price</p>
      <p className="mb-3 text-xs text-muted-foreground">
        {formatMoney(facets.priceRange.min, currency, siteConfig.locale)} –{' '}
        {formatMoney(facets.priceRange.max, currency, siteConfig.locale)}
      </p>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={min}
          min={0}
          max={bounds.max}
          onChange={(event) => setMin(event.target.value)}
          aria-label="Minimum price"
          placeholder={String(bounds.min)}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2.5 text-sm placeholder:text-subtle-foreground"
        />
        <span aria-hidden className="text-xs text-subtle-foreground">
          to
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={max}
          min={0}
          max={bounds.max}
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
