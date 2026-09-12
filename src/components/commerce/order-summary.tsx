import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import type { CartTotals } from '@/types/cart';

function Row({
  label,
  value,
  emphasis,
  muted,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 text-sm',
        emphasis && 'border-t pt-3 text-base',
        muted && 'text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Totals block, shared by the cart, checkout and confirmation.
 *
 * Every figure comes from the server-computed `CartTotals`; nothing is
 * recalculated in the browser, so what the shopper reads is what will be
 * charged.
 */
export function OrderSummary({
  totals,
  discountCode,
  children,
  className,
}: {
  totals: CartTotals;
  discountCode?: string | null;
  children?: React.ReactNode;
  className?: string;
}) {
  const money = (amount: number) => formatMoney(amount, totals.currency, siteConfig.locale);

  return (
    <div className={cn('rounded-lg border bg-surface p-5', className)}>
      <h2 className="font-display text-lg">Order summary</h2>

      <div className="mt-4 space-y-3">
        <Row label="Subtotal" value={money(totals.subtotal)} />

        {totals.discountTotal > 0 ? (
          <Row
            label={discountCode ? `Discount (${discountCode})` : 'Discount'}
            value={`− ${money(totals.discountTotal)}`}
          />
        ) : null}

        <Row
          label="Shipping"
          value={totals.shippingTotal === 0 ? 'Free' : money(totals.shippingTotal)}
        />

        {totals.taxTotal > 0 ? <Row label="Tax" value={money(totals.taxTotal)} /> : null}

        <Row label="Total" value={money(totals.grandTotal)} emphasis />
      </div>

      {totals.freeShippingRemaining !== null ? (
        <p className="mt-4 rounded-md bg-accent-soft px-3 py-2.5 text-xs text-accent">
          Add {money(totals.freeShippingRemaining)} more for free shipping.
        </p>
      ) : null}

      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
