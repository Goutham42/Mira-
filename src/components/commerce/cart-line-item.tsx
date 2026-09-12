'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTransition } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';
import { removeCartItemAction, updateCartItemAction } from '@/actions/cart';
import type { CartLine } from '@/types/cart';

const ISSUE_MESSAGE: Record<NonNullable<CartLine['issue']>, string> = {
  OUT_OF_STOCK: 'Sold out — remove to continue',
  QUANTITY_REDUCED: 'Quantity reduced to match remaining stock',
  UNAVAILABLE: 'No longer available — remove to continue',
};

export function CartLineItem({
  line,
  currency,
  compact = false,
}: {
  line: CartLine;
  currency: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function setQuantity(quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemAction({ itemId: line.id, quantity });
      if (!result.ok) toast.error(result.error.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartItemAction({ itemId: line.id });
      if (!result.ok) toast.error(result.error.message);
    });
  }

  const atMax = line.quantity >= line.available;

  return (
    <li className={cn('flex gap-4 py-5', isPending && 'opacity-60')}>
      <Link
        href={`/p/${line.productSlug}`}
        className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded bg-surface-muted"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt=""
            aria-hidden
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/p/${line.productSlug}`} className="text-sm hover:underline">
              {line.productTitle}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{line.variantTitle}</p>
          </div>

          <p className="shrink-0 text-sm tabular-nums">
            {formatMoney(line.lineTotal, currency, siteConfig.locale)}
          </p>
        </div>

        {line.issue ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {ISSUE_MESSAGE[line.issue]}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="inline-flex items-center rounded-md border">
            <button
              type="button"
              onClick={() => setQuantity(line.quantity - 1)}
              disabled={isPending || line.quantity <= 1}
              aria-label={`Decrease quantity of ${line.productTitle}`}
              className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>

            <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
              {line.quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(line.quantity + 1)}
              disabled={isPending || atMax}
              aria-label={`Increase quantity of ${line.productTitle}`}
              className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            {compact ? null : 'Remove'}
          </button>
        </div>
      </div>
    </li>
  );
}
