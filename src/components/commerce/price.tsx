import { formatMoney, calculateDiscountPercent } from '@/lib/money';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * Renders a price, and its struck-through original when discounted.
 *
 * The compare-at price is only shown when it is genuinely higher — a
 * "was/now" where the two are equal is misleading, and in several
 * jurisdictions unlawful.
 */
export function Price({
  amount,
  compareAt,
  currency = siteConfig.currency,
  size = 'md',
  className,
}: {
  amount: number;
  compareAt?: number | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const discount = calculateDiscountPercent(amount, compareAt ?? null);
  // Narrowed once so the markup below reads as one condition rather than
  // repeating the pair, and so `compareAt` is non-null inside the branch.
  const isDiscounted = discount !== null && compareAt != null;

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span
        className={cn(
          'tabular-nums',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-xl',
        )}
      >
        {/*
          Strikethrough is a purely visual signal — `line-through` is not
          announced, so without these labels a screen reader reads two bare
          amounts and the discount has to be inferred.
        */}
        {isDiscounted ? <span className="sr-only">Sale price </span> : null}
        {formatMoney(amount, currency, siteConfig.locale)}
      </span>

      {isDiscounted ? (
        <>
          <span
            className={cn(
              'text-subtle-foreground line-through tabular-nums',
              size === 'lg' ? 'text-sm' : 'text-xs',
            )}
          >
            <span className="sr-only">Regular price </span>
            {formatMoney(compareAt, currency, siteConfig.locale)}
          </span>
          <span className="text-xs font-medium text-accent">{discount}% off</span>
        </>
      ) : null}
    </span>
  );
}

/** Price span for a product whose variants differ in price. */
export function PriceRange({
  min,
  max,
  currency = siteConfig.currency,
  className,
}: {
  min: number;
  max: number;
  currency?: string;
  className?: string;
}) {
  if (min === max) return <Price amount={min} currency={currency} className={className} />;

  return (
    <span className={cn('tabular-nums', className)}>
      {formatMoney(min, currency, siteConfig.locale)} –{' '}
      {formatMoney(max, currency, siteConfig.locale)}
    </span>
  );
}
