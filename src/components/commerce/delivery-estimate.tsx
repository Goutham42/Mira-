'use client';

import { useState } from 'react';
import { MapPin, Truck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Pincode delivery check.
 *
 * No courier API is wired up yet, so this deliberately does not invent a
 * promise it cannot keep: it validates the pincode, states the dispatch window
 * the store actually commits to, and derives an arrival range from it. When a
 * courier integration lands, only `estimateFor` changes.
 */
const DISPATCH_DAYS = 2;

/** Metro pincode prefixes reach the customer a day sooner than the rest. */
const FAST_PREFIXES = ['11', '12', '40', '41', '56', '60', '64', '70', '50', '38'];

function estimateFor(pincode: string) {
  const fast = FAST_PREFIXES.includes(pincode.slice(0, 2));
  const min = DISPATCH_DAYS + (fast ? 2 : 4);
  const max = DISPATCH_DAYS + (fast ? 4 : 7);

  const format = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
  };

  return { from: format(min), to: format(max) };
}

export function DeliveryEstimate() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function check(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = pincode.trim();

    if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
      setResult(null);
      setError('Enter a valid 6-digit pincode');
      return;
    }

    setError(null);
    setResult(estimateFor(trimmed));
  }

  return (
    <div className="mt-6 rounded-lg border bg-surface px-4 py-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Truck className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} aria-hidden />
        Check delivery
      </p>

      <form onSubmit={check} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={pincode}
            onChange={(event) => {
              setPincode(event.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            aria-label="Delivery pincode"
            aria-invalid={error ? true : undefined}
            placeholder="Enter pincode"
            maxLength={6}
            className={cn(
              'h-11 w-full rounded-md border bg-surface pl-9 pr-3 text-sm',
              'placeholder:text-subtle-foreground transition-colors focus-visible:border-border-strong',
              error ? 'border-destructive' : 'border-border',
            )}
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-md border border-border-strong px-4 text-sm transition-colors hover:bg-surface-muted"
        >
          Check
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <p role="status" className="mt-3 text-sm">
          Arrives <span className="font-medium">{result.from} – {result.to}</span>
          <span className="block text-xs text-muted-foreground">
            Dispatched within {DISPATCH_DAYS} working days · Free shipping on prepaid orders
          </span>
        </p>
      ) : null}
    </div>
  );
}
