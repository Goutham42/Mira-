import 'server-only';
import type { DiscountCode } from '@prisma/client';

import { db } from '@/server/db';
import { env } from '@/config/env';
import { badRequest, notFound } from '@/server/errors';
import { applyBasisPoints, percentOf } from '@/lib/money';
import type { CartLine, CartTotals } from '@/types/cart';

/**
 * Order arithmetic.
 *
 * Every figure a shopper sees is produced here from database values. Nothing
 * that arrives from the browser is ever used as an amount — the client sends
 * intent (which variant, how many, which code), never money.
 */

export type DiscountContext = {
  code: DiscountCode;
  amount: number;
};

export function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
}

export function computeShipping(subtotalAfterDiscount: number, freeShipping: boolean): number {
  if (freeShipping) return 0;
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= env.FREE_SHIPPING_THRESHOLD_MINOR
    ? 0
    : env.STANDARD_SHIPPING_FEE_MINOR;
}

/**
 * Tax on the discounted goods total, excluding shipping.
 *
 * A single flat rate is a placeholder for a real tax engine — correct for a
 * single-jurisdiction store, and the one place to replace when that changes.
 */
export function computeTax(taxableBase: number): number {
  return applyBasisPoints(taxableBase, env.TAX_RATE_BPS);
}

export function computeTotals(
  lines: CartLine[],
  currency: string,
  discount: DiscountContext | null = null,
): CartTotals {
  const subtotal = computeSubtotal(lines);

  const discountTotal = discount ? Math.min(discount.amount, subtotal) : 0;
  const discountedSubtotal = subtotal - discountTotal;

  const freeShipping = discount?.code.type === 'FREE_SHIPPING';
  const shippingTotal = computeShipping(discountedSubtotal, Boolean(freeShipping));
  const taxTotal = computeTax(discountedSubtotal);

  const remaining = env.FREE_SHIPPING_THRESHOLD_MINOR - discountedSubtotal;

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal: discountedSubtotal + shippingTotal + taxTotal,
    currency,
    freeShippingRemaining: shippingTotal > 0 && remaining > 0 ? remaining : null,
  };
}

/** The monetary value a code is worth against a given subtotal. */
export function discountAmountFor(code: DiscountCode, subtotal: number): number {
  switch (code.type) {
    case 'PERCENT':
      return percentOf(subtotal, code.value);
    case 'FIXED':
      return Math.min(code.value, subtotal);
    case 'FREE_SHIPPING':
      // Value shows up as zero-rated shipping, not as a line discount.
      return 0;
    default:
      return 0;
  }
}

/**
 * Validate a code against the current cart.
 *
 * Called both when the shopper applies the code and again inside the order
 * transaction — the second call is the one that counts, because usage limits
 * can be exhausted between the two.
 */
export async function validateDiscountCode(
  rawCode: string,
  subtotal: number,
  userId: string | null,
): Promise<DiscountContext> {
  const code = await db.discountCode.findUnique({ where: { code: rawCode.toUpperCase() } });

  if (!code || !code.isActive) throw notFound('Discount code');

  const now = new Date();
  if (code.startsAt && code.startsAt > now) throw badRequest('That code is not active yet.');
  if (code.endsAt && code.endsAt < now) throw badRequest('That code has expired.');

  if (code.minSubtotal && subtotal < code.minSubtotal) {
    throw badRequest('Your order does not meet the minimum for that code.');
  }

  if (code.usageLimit !== null && code.usageCount >= code.usageLimit) {
    throw badRequest('That code has been fully redeemed.');
  }

  if (code.perUserLimit !== null && userId) {
    const used = await db.discountRedemption.count({
      where: { discountCodeId: code.id, userId },
    });
    if (used >= code.perUserLimit) {
      throw badRequest('You have already used that code.');
    }
  }

  return { code, amount: discountAmountFor(code, subtotal) };
}
