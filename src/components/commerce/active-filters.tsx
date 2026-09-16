'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';

import { formatMoney, toMinorUnits } from '@/lib/money';
import { siteConfig } from '@/config/site';

const FILTER_KEYS = ['size', 'color', 'minPrice', 'maxPrice', 'inStock'] as const;

/** Price params are whole currency units in the URL; formatMoney wants minor. */
function formatMajor(value: string, currency: string): string {
  return formatMoney(toMinorUnits(Number(value), currency), currency, siteConfig.locale);
}

/**
 * Removable chips for whatever is currently filtered.
 *
 * On a phone the filter panel lives behind a sheet, so without this there is no
 * way to see what is applied — or drop one thing — without reopening it.
 */
export function ActiveFilters({ currency = siteConfig.currency }: { currency?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const chips: { key: string; value: string; label: string }[] = [];

  for (const value of searchParams.getAll('size')) {
    chips.push({ key: 'size', value, label: `Size ${value}` });
  }
  for (const value of searchParams.getAll('color')) {
    chips.push({ key: 'color', value, label: value });
  }

  if (searchParams.get('inStock') === '1') {
    chips.push({ key: 'inStock', value: '1', label: 'In stock only' });
  }

  const min = searchParams.get('minPrice');
  const max = searchParams.get('maxPrice');
  if (min) {
    chips.push({ key: 'minPrice', value: min, label: `From ${formatMajor(min, currency)}` });
  }
  if (max) {
    chips.push({ key: 'maxPrice', value: max, label: `Up to ${formatMajor(max, currency)}` });
  }

  if (chips.length === 0) return null;

  function remove(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    // Single-valued keys are dropped outright; the repeatable ones keep their
    // other values.
    if (key === 'minPrice' || key === 'maxPrice' || key === 'inStock') {
      params.delete(key);
    } else {
      const remaining = params.getAll(key).filter((entry) => entry !== value);
      params.delete(key);
      for (const entry of remaining) params.append(key, entry);
    }

    params.delete('page');
    startTransition(() => {
      router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      });
    });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of [...FILTER_KEYS, 'page']) params.delete(key);
    startTransition(() => {
      router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 transition-opacity', isPending && 'opacity-60')}
      aria-busy={isPending || undefined}
    >
      {chips.map((chip) => (
        <button
          key={`${chip.key}:${chip.value}`}
          type="button"
          onClick={() => remove(chip.key, chip.value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs transition-colors hover:bg-surface-muted"
        >
          {chip.label}
          <X className="size-3" strokeWidth={2} aria-hidden />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}

      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
