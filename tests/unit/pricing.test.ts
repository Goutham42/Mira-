import { describe, expect, it } from 'vitest';
import type { DiscountCode } from '@prisma/client';

import { computeShipping, computeTotals, discountAmountFor } from '@/server/services/pricing.service';
import type { CartLine } from '@/types/cart';

function line(unitPrice: number, quantity: number): CartLine {
  return {
    id: `line-${unitPrice}-${quantity}`,
    variantId: 'variant',
    productId: 'product',
    productSlug: 'product',
    productTitle: 'Product',
    variantTitle: 'M / Ivory',
    sku: 'SKU',
    imageUrl: null,
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
    available: 10,
    issue: null,
  };
}

function discountCode(overrides: Partial<DiscountCode>): DiscountCode {
  return {
    id: 'code',
    code: 'TEST',
    description: null,
    type: 'PERCENT',
    value: 10,
    minSubtotal: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DiscountCode;
}

const FREE_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD_MINOR ?? 200_000);
const SHIPPING_FEE = Number(process.env.STANDARD_SHIPPING_FEE_MINOR ?? 9_900);

describe('computeTotals', () => {
  it('sums line totals into the subtotal', () => {
    const totals = computeTotals([line(100_000, 2), line(50_000, 1)], 'INR');
    expect(totals.subtotal).toBe(250_000);
    expect(totals.grandTotal).toBe(250_000 + totals.shippingTotal + totals.taxTotal);
  });

  it('returns a zeroed total for an empty cart and charges no shipping', () => {
    const totals = computeTotals([], 'INR');
    expect(totals.subtotal).toBe(0);
    expect(totals.shippingTotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  it('applies a percentage discount before shipping is decided', () => {
    // Subtotal clears the free-shipping bar, but not after the discount.
    const subtotal = FREE_SHIPPING_THRESHOLD + 1_000;
    const totals = computeTotals([line(subtotal, 1)], 'INR', {
      code: discountCode({ type: 'PERCENT', value: 50 }),
      amount: Math.floor(subtotal / 2),
    });

    expect(totals.discountTotal).toBe(Math.floor(subtotal / 2));
    expect(totals.shippingTotal).toBe(SHIPPING_FEE);
  });

  it('never discounts more than the subtotal', () => {
    const totals = computeTotals([line(10_000, 1)], 'INR', {
      code: discountCode({ type: 'FIXED', value: 999_999 }),
      amount: 999_999,
    });

    expect(totals.discountTotal).toBe(10_000);
    expect(totals.grandTotal).toBeGreaterThanOrEqual(0);
  });

  it('zeroes shipping for a free-shipping code regardless of subtotal', () => {
    const totals = computeTotals([line(1_000, 1)], 'INR', {
      code: discountCode({ type: 'FREE_SHIPPING', value: 0 }),
      amount: 0,
    });

    expect(totals.shippingTotal).toBe(0);
    expect(totals.freeShippingRemaining).toBeNull();
  });

  it('reports how much more is needed to earn free shipping', () => {
    const totals = computeTotals([line(1_000, 1)], 'INR');
    expect(totals.freeShippingRemaining).toBe(FREE_SHIPPING_THRESHOLD - 1_000);
  });
});

describe('computeShipping', () => {
  it('is free at or above the threshold', () => {
    expect(computeShipping(FREE_SHIPPING_THRESHOLD, false)).toBe(0);
    expect(computeShipping(FREE_SHIPPING_THRESHOLD - 1, false)).toBe(SHIPPING_FEE);
  });

  it('is free when the cart is empty', () => {
    expect(computeShipping(0, false)).toBe(0);
  });
});

describe('discountAmountFor', () => {
  it('computes percent and fixed discounts, and treats free shipping as zero', () => {
    expect(discountAmountFor(discountCode({ type: 'PERCENT', value: 25 }), 10_000)).toBe(2_500);
    expect(discountAmountFor(discountCode({ type: 'FIXED', value: 3_000 }), 10_000)).toBe(3_000);
    expect(discountAmountFor(discountCode({ type: 'FIXED', value: 30_000 }), 10_000)).toBe(10_000);
    expect(discountAmountFor(discountCode({ type: 'FREE_SHIPPING', value: 0 }), 10_000)).toBe(0);
  });
});
