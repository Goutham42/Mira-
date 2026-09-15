'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Ruler, ShieldCheck, Truck } from 'lucide-react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { addToCartAction } from '@/actions/cart';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';
import type { ProductDetailData } from '@/types/catalog';
import { Price, PriceRange } from './price';
import { ProductGallery } from './product-gallery';
import { VariantSelector } from './variant-selector';
import { WishlistButton } from './wishlist-button';
import { StarRating } from './star-rating';
import { DeliveryEstimate } from './delivery-estimate';

const LOW_STOCK_AT = 5;

/**
 * The buying surface: gallery, option selection and add-to-cart.
 *
 * These share one piece of state — the selected option values — so they live in
 * one client component rather than being wired together through the page. The
 * page itself stays a Server Component and renders everything else.
 */
export function ProductViewer({
  product,
  inWishlist,
  freeShippingThreshold,
}: {
  product: ProductDetailData;
  inWishlist: boolean;
  /** Passed from the server so the shipping promise cannot drift from the
   *  threshold the pricing service actually applies. */
  freeShippingThreshold: number;
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
   * shopper's other current picks.
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
    const colorOption = product.options.find(
      (option) => option.name.toLowerCase() === 'color',
    );
    if (!colorOption) return null;
    const selectedId = selection[colorOption.id];
    return colorOption.values.find((value) => value.id === selectedId)?.value ?? null;
  }, [product.options, selection]);

  const missingOption = product.options.find((option) => !selection[option.id]);

  function onAddToCart() {
    if (!matchedVariant) return;

    startTransition(async () => {
      const result = await addToCartAction({
        variantId: matchedVariant.id,
        quantity: 1,
      });

      if (result.ok) {
        toast.success('Added to your bag', { description: product.title });
      } else {
        toast.error(result.error.message);
      }
    });
  }

  const soldOut = matchedVariant !== null && matchedVariant.available <= 0;
  const lowStock =
    matchedVariant !== null &&
    matchedVariant.available > 0 &&
    matchedVariant.available <= LOW_STOCK_AT;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <ProductGallery images={product.images} title={product.title} activeColor={activeColor} />

      <div className="lg:sticky lg:top-24 lg:self-start">
        {product.brand ? <p className="label-caps">{product.brand}</p> : null}

        <h1 className="mt-1 text-3xl md:text-4xl">{product.title}</h1>

        {product.rating ? (
          <a
            href="#reviews"
            className="mt-2.5 inline-flex items-center gap-2 text-sm transition-colors hover:text-accent"
          >
            <StarRating value={product.rating.average} size="md" showValue />
            <span className="text-muted-foreground underline underline-offset-4">
              {product.rating.count} review{product.rating.count === 1 ? '' : 's'}
            </span>
          </a>
        ) : null}

        <div className="mt-3 text-lg">
          {matchedVariant ? (
            <Price
              amount={matchedVariant.price}
              compareAt={matchedVariant.compareAtPrice}
              currency={product.currency}
              size="lg"
            />
          ) : product.priceRange.min === product.priceRange.max ? (
            /* Every variant is the same price, so show the real price and its
               saving straight away. Hiding the discount until a size is picked
               contradicts the listing card the shopper just clicked. */
            <Price
              amount={product.priceRange.min}
              compareAt={product.compareAtPrice}
              currency={product.currency}
              size="lg"
            />
          ) : (
            <PriceRange
              min={product.priceRange.min}
              max={product.priceRange.max}
              currency={product.currency}
              className="text-xl"
            />
          )}
        </div>

        {product.shortDescription ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="mt-8 space-y-6">
          {product.options.map((option) => (
            <VariantSelector
              key={option.id}
              option={option}
              selectedValueId={selection[option.id] ?? null}
              unavailableValueIds={unavailableValueIds}
              onSelect={(valueId) =>
                setSelection((current) => ({ ...current, [option.id]: valueId }))
              }
              headerAction={
                option.name.toLowerCase() === 'size' ? (
                  <Link
                    href="/legal/size-guide"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-accent"
                  >
                    <Ruler className="size-3.5" strokeWidth={1.6} aria-hidden />
                    Size guide
                  </Link>
                ) : null
              }
            />
          ))}
        </div>

        {lowStock ? (
          <p className="mt-4 text-sm text-accent" role="status">
            Only {matchedVariant?.available} left
          </p>
        ) : null}

        <div className="mt-8 flex gap-3">
          <Button
            size="lg"
            full
            loading={isPending}
            disabled={!matchedVariant || soldOut}
            onClick={onAddToCart}
          >
            {product.isSoldOut
              ? 'Sold out'
              : missingOption
                ? `Select ${missingOption.name.toLowerCase()}`
                : soldOut
                  ? 'Sold out'
                  : 'Add to bag'}
          </Button>

          <WishlistButton
            productId={product.id}
            initialInWishlist={inWishlist}
            withLabel
            className="border border-border-strong bg-transparent hover:bg-surface-muted"
          />
        </div>

        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Truck className="size-4 shrink-0" aria-hidden />
            Free shipping over{' '}
            {formatMoney(freeShippingThreshold, product.currency, siteConfig.locale)}
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            30-day returns on unworn pieces
          </li>
        </ul>

        <DeliveryEstimate />

        {matchedVariant ? (
          <p className="mt-6 text-xs text-subtle-foreground">SKU {matchedVariant.sku}</p>
        ) : null}
      </div>

      {/* Mobile buy bar. The desktop column is sticky, but on a phone the real
          Add to bag scrolls away well before the shopper has finished reading,
          so it is mirrored here. Hidden from assistive tech to avoid announcing
          a second copy of the same control. */}
      <div
        aria-hidden
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{product.title}</p>
          <div className="text-sm">
            {matchedVariant ? (
              <Price
                amount={matchedVariant.price}
                compareAt={matchedVariant.compareAtPrice}
                currency={product.currency}
              />
            ) : (
              <PriceRange
                min={product.priceRange.min}
                max={product.priceRange.max}
                currency={product.currency}
              />
            )}
          </div>
        </div>

        <Button
          size="lg"
          tabIndex={-1}
          loading={isPending}
          disabled={!matchedVariant || soldOut}
          onClick={onAddToCart}
          className="shrink-0"
        >
          {product.isSoldOut || soldOut
            ? 'Sold out'
            : missingOption
              ? `Select ${missingOption.name.toLowerCase()}`
              : 'Add to bag'}
        </Button>
      </div>

      {/* Runway so the fixed bar never covers the last of the page. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </div>
  );
}
