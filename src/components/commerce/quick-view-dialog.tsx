'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { getQuickViewAction } from '@/actions/catalog';
import { addToCartAction } from '@/actions/cart';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { QuickViewData } from '@/types/catalog';
import { Price } from './price';
import { StarRating } from './star-rating';
import { VariantSelector } from './variant-selector';

/**
 * Peek at a product without leaving the grid.
 *
 * Fetched on open rather than shipped with every card: a page of 24 cards would
 * otherwise carry 24 full option/variant matrices the shopper will almost
 * certainly never look at. The trade is a short spinner the first time, which
 * the skeleton covers.
 *
 * Deliberately not a replacement for the product page — there is no
 * description, care or delivery detail here, and the footer link is the way
 * through to all of it.
 */
export function QuickViewDialog({
  slug,
  onClose,
}: {
  /** Null when closed. Changing it loads a different product. */
  slug: string | null;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<QuickViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setProduct(null);
    setError(null);
    setLoading(true);

    getQuickViewAction({ slug })
      .then((result) => {
        // A second open can resolve before the first; drop the stale answer.
        if (cancelled) return;
        if (result.ok) setProduct(result.data);
        else setError(result.error.message);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this product.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <Dialog open={slug !== null} onOpenChange={(open) => !open && onClose()}>
      {slug !== null ? (
        <DialogContent
          title={product?.title ?? 'Quick view'}
          description={product?.shortDescription ?? undefined}
          className="max-w-2xl"
        >
          {loading ? <QuickViewSkeleton /> : null}

          {error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : null}

          {product ? <QuickViewBody product={product} onClose={onClose} /> : null}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function QuickViewSkeleton() {
  return (
    <div className="flex gap-6">
      <Skeleton className="aspect-[3/4] w-40 shrink-0 sm:w-52" />
      <div className="flex-1 space-y-3 py-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    </div>
  );
}

function QuickViewBody({
  product,
  onClose,
}: {
  product: QuickViewData;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Preselect any option that has only one value; there is nothing to choose.
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const option of product.options) {
      const only = option.values.length === 1 ? option.values[0] : undefined;
      if (only) initial[option.id] = only.id;
    }
    return initial;
  });

  const selectedValueIds = useMemo(() => Object.values(selection), [selection]);

  const matchedVariant = useMemo(() => {
    if (selectedValueIds.length !== product.options.length) return null;
    return (
      product.variants.find(
        (variant) =>
          variant.optionValueIds.length === selectedValueIds.length &&
          selectedValueIds.every((id) => variant.optionValueIds.includes(id)),
      ) ?? null
    );
  }, [product.options.length, product.variants, selectedValueIds]);

  /**
   * A value is unavailable when no purchasable variant combines it with the
   * shopper's other current picks. Same rule as the product page, so the two
   * never disagree about what is buyable.
   */
  const unavailableValueIds = useMemo(() => {
    const unavailable = new Set<string>();

    for (const option of product.options) {
      const otherPicks = Object.entries(selection)
        .filter(([optionId]) => optionId !== option.id)
        .map(([, valueId]) => valueId);

      for (const value of option.values) {
        const combinable = product.variants.some(
          (variant) =>
            variant.isActive &&
            variant.available > 0 &&
            variant.optionValueIds.includes(value.id) &&
            otherPicks.every((pick) => variant.optionValueIds.includes(pick)),
        );
        if (!combinable) unavailable.add(value.id);
      }
    }

    return unavailable;
  }, [product.options, product.variants, selection]);

  const activeColor = useMemo(() => {
    const colorOption = product.options.find((option) => option.name.toLowerCase() === 'color');
    if (!colorOption) return null;
    const selectedId = selection[colorOption.id];
    return colorOption.values.find((value) => value.id === selectedId)?.value ?? null;
  }, [product.options, selection]);

  const image =
    (activeColor ? product.images.find((img) => img.colorValue === activeColor) : undefined) ??
    product.images[0];

  const missingOption = product.options.find((option) => !selection[option.id]);
  const soldOut = matchedVariant !== null && matchedVariant.available <= 0;

  function onAddToCart() {
    if (!matchedVariant) return;

    startTransition(async () => {
      const result = await addToCartAction({ variantId: matchedVariant.id, quantity: 1 });
      if (result.ok) {
        toast.success('Added to your bag', { description: product.title });
        onClose();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-md bg-surface-muted sm:w-52">
        {image ? (
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt ?? product.title}
            fill
            sizes="(min-width: 640px) 208px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-subtle-foreground">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-1.5">
          <Price
            amount={matchedVariant?.price ?? product.priceRange.min}
            compareAt={matchedVariant?.compareAtPrice ?? product.compareAtPrice}
            size="lg"
          />
          {product.rating ? (
            <StarRating value={product.rating.average} count={product.rating.count} />
          ) : null}
        </div>

        {product.options.map((option) => (
          <VariantSelector
            key={option.id}
            option={option}
            selectedValueId={selection[option.id] ?? null}
            unavailableValueIds={unavailableValueIds}
            onSelect={(valueId) =>
              setSelection((current) => ({ ...current, [option.id]: valueId }))
            }
          />
        ))}

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!matchedVariant || soldOut || isPending}
            className={cn(
              'w-full rounded-md bg-primary py-2.5 text-sm text-primary-foreground transition-opacity',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isPending
              ? 'Adding…'
              : soldOut
                ? 'Sold out'
                : missingOption
                  ? `Choose a ${missingOption.name.toLowerCase()}`
                  : 'Add to bag'}
          </button>

          <Link
            href={`/p/${product.slug}`}
            className="block py-1 text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}
