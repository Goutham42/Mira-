import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { badRequest, notFound, outOfStock } from '@/server/errors';
import { getCurrentUser } from '@/server/auth/session';
import { clientEnv } from '@/config/env';
import type { AppliedDiscount, CartLine, CartView } from '@/types/cart';
import { availableUnits } from './inventory.service';
import { computeTotals, validateDiscountCode, type DiscountContext } from './pricing.service';

/**
 * Cart identity.
 *
 * A guest cart is addressed by a 256-bit random token in an httpOnly cookie.
 * The token is unguessable, so it is not additionally signed — signing would
 * protect against forgery of a value that is already infeasible to forge, and
 * the cookie carries no claims of its own.
 */
const CART_COOKIE = 'mira_cart';
const CART_TTL_DAYS = 30;
const MAX_QUANTITY_PER_LINE = 20;

function cartExpiry() {
  return new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

const lineSelect = {
  id: true,
  quantity: true,
  variantId: true,
  variant: {
    select: {
      id: true,
      sku: true,
      price: true,
      isActive: true,
      imageUrl: true,
      inventoryItem: { select: { quantity: true, reserved: true, allowBackorder: true } },
      optionValues: {
        orderBy: { optionValue: { option: { position: 'asc' } } },
        select: { optionValue: { select: { value: true } } },
      },
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          deletedAt: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

type LineRow = Prisma.CartItemGetPayload<{ select: typeof lineSelect }>;

function toCartLine(row: LineRow): CartLine {
  const { variant } = row;
  const available = variant.inventoryItem ? availableUnits(variant.inventoryItem) : 0;
  const purchasable =
    variant.isActive && variant.product.status === 'ACTIVE' && variant.product.deletedAt === null;

  let issue: CartLine['issue'] = null;
  let quantity = row.quantity;

  if (!purchasable) {
    issue = 'UNAVAILABLE';
    quantity = 0;
  } else if (available <= 0) {
    issue = 'OUT_OF_STOCK';
    quantity = 0;
  } else if (row.quantity > available) {
    issue = 'QUANTITY_REDUCED';
    quantity = available;
  }

  return {
    id: row.id,
    variantId: variant.id,
    productId: variant.product.id,
    productSlug: variant.product.slug,
    productTitle: variant.product.title,
    variantTitle: variant.optionValues.map((link) => link.optionValue.value).join(' / '),
    sku: variant.sku,
    imageUrl: variant.imageUrl ?? variant.product.images[0]?.url ?? null,
    // Live price from the variant, never a stored copy: a price change between
    // adding to cart and checking out must be visible before payment.
    unitPrice: variant.price,
    quantity,
    lineTotal: variant.price * quantity,
    available: Math.min(available, MAX_QUANTITY_PER_LINE),
    issue,
  };
}

function emptyCart(): CartView {
  return {
    id: null,
    lines: [],
    totals: computeTotals([], clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY),
    itemCount: 0,
    discount: null,
    hasIssues: false,
  };
}

async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

const cartSelect = { id: true, currency: true, discountCode: true } satisfies Prisma.CartSelect;

type CartRecord = Prisma.CartGetPayload<{ select: typeof cartSelect }>;

/** Resolve the caller's cart without creating one. Safe inside a render. */
async function findCart(): Promise<CartRecord | null> {
  const user = await getCurrentUser();

  if (user) {
    const existing = await db.cart.findUnique({
      where: { userId: user.id },
      select: cartSelect,
    });
    if (existing) return existing;
  }

  const token = await readCartToken();
  if (!token) return null;

  return db.cart.findUnique({ where: { anonymousId: token }, select: cartSelect });
}

/**
 * Resolve or create the caller's cart.
 *
 * Only callable from a Server Action or Route Handler — it may write the guest
 * cookie, which Next forbids during a component render.
 */
async function getOrCreateCart(): Promise<CartRecord> {
  const existing = await findCart();
  if (existing) return existing;

  const user = await getCurrentUser();

  if (user) {
    const cart = await db.cart.create({
      data: {
        userId: user.id,
        currency: clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY,
        expiresAt: cartExpiry(),
      },
      select: cartSelect,
    });
    return cart;
  }

  const token = randomBytes(32).toString('base64url');
  const cart = await db.cart.create({
    data: {
      anonymousId: token,
      currency: clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY,
      expiresAt: cartExpiry(),
    },
    select: cartSelect,
  });

  const store = await cookies();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  });

  return cart;
}

async function loadDiscount(
  cartId: string,
  code: string | null,
  subtotal: number,
  userId: string | null,
): Promise<DiscountContext | null> {
  if (!code) return null;

  try {
    return await validateDiscountCode(code, subtotal, userId);
  } catch {
    // The code stopped being valid (expired, exhausted, or the subtotal fell
    // below its minimum). Drop it silently rather than blocking the cart.
    await db.cart.update({ where: { id: cartId }, data: { discountCode: null } });
    return null;
  }
}

/** Read-only cart projection. Safe to call from a Server Component. */
export async function getCartView(): Promise<CartView> {
  const cart = await findCart();
  if (!cart) return emptyCart();

  const user = await getCurrentUser();
  const rows = await db.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
    select: lineSelect,
  });

  const lines = rows.map(toCartLine);
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const discount = await loadDiscount(cart.id, cart.discountCode, subtotal, user?.id ?? null);

  const appliedDiscount: AppliedDiscount | null = discount
    ? {
        code: discount.code.code,
        description: discount.code.description,
        amount: discount.amount,
      }
    : null;

  return {
    id: cart.id,
    lines,
    totals: computeTotals(lines, cart.currency, discount),
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
    discount: appliedDiscount,
    hasIssues: lines.some((line) => line.issue !== null),
  };
}

/** Item count only — used by the header badge on every page. */
export async function getCartItemCount(): Promise<number> {
  const cart = await findCart();
  if (!cart) return 0;

  const result = await db.cartItem.aggregate({
    where: { cartId: cart.id },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function addToCart(variantId: string, quantity: number): Promise<CartView> {
  const variant = await db.productVariant.findFirst({
    where: {
      id: variantId,
      isActive: true,
      product: { status: 'ACTIVE', deletedAt: null },
    },
    select: {
      id: true,
      inventoryItem: { select: { quantity: true, reserved: true, allowBackorder: true } },
    },
  });
  if (!variant) throw notFound('That item');

  const cart = await getOrCreateCart();

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    select: { id: true, quantity: true },
  });

  const requested = (existing?.quantity ?? 0) + quantity;
  const available = variant.inventoryItem ? availableUnits(variant.inventoryItem) : 0;

  if (available <= 0) throw outOfStock('That size is sold out.');
  if (requested > available) {
    throw outOfStock(
      available === (existing?.quantity ?? 0)
        ? 'You already have all the remaining stock in your cart.'
        : `Only ${available} left — adjust the quantity to continue.`,
    );
  }

  const capped = Math.min(requested, MAX_QUANTITY_PER_LINE);

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: capped } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity: capped } });
  }

  await db.cart.update({ where: { id: cart.id }, data: { expiresAt: cartExpiry() } });

  return getCartView();
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartView> {
  const cart = await getOrCreateCart();

  // Scoped to this cart: an item id from someone else's cart must not resolve.
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    select: {
      id: true,
      variant: {
        select: {
          inventoryItem: { select: { quantity: true, reserved: true, allowBackorder: true } },
        },
      },
    },
  });
  if (!item) throw notFound('Cart item');

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return getCartView();
  }

  const available = item.variant.inventoryItem
    ? availableUnits(item.variant.inventoryItem)
    : 0;
  if (quantity > available) {
    throw outOfStock(`Only ${available} left in stock.`);
  }

  await db.cartItem.update({
    where: { id: item.id },
    data: { quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE) },
  });

  return getCartView();
}

export async function removeCartItem(itemId: string): Promise<CartView> {
  const cart = await getOrCreateCart();
  const deleted = await db.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  if (deleted.count === 0) throw notFound('Cart item');
  return getCartView();
}

export async function applyDiscountCode(rawCode: string): Promise<CartView> {
  const cart = await getOrCreateCart();
  const user = await getCurrentUser();

  const rows = await db.cartItem.findMany({
    where: { cartId: cart.id },
    select: lineSelect,
  });
  const lines = rows.map(toCartLine);
  if (lines.length === 0) throw badRequest('Add something to your cart first.');

  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);

  // Throws if the code is not usable, which surfaces as a field error.
  const { code } = await validateDiscountCode(rawCode, subtotal, user?.id ?? null);

  await db.cart.update({ where: { id: cart.id }, data: { discountCode: code.code } });

  return getCartView();
}

export async function removeDiscountCode(): Promise<CartView> {
  const cart = await getOrCreateCart();
  await db.cart.update({ where: { id: cart.id }, data: { discountCode: null } });
  return getCartView();
}

/**
 * Fold a guest cart into the user's cart at sign-in.
 *
 * Quantities are summed and then clamped to what is actually in stock, so
 * signing in can never produce a cart that cannot be checked out.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const token = await readCartToken();
  if (!token) return;

  const guestCart = await db.cart.findUnique({
    where: { anonymousId: token },
    select: { id: true, items: { select: { variantId: true, quantity: true } } },
  });
  if (!guestCart) return;

  if (guestCart.items.length === 0) {
    await db.cart.delete({ where: { id: guestCart.id } }).catch(() => undefined);
    return;
  }

  const userCart = await db.cart.upsert({
    where: { userId },
    create: {
      userId,
      currency: clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY,
      expiresAt: cartExpiry(),
    },
    update: { expiresAt: cartExpiry() },
    select: { id: true },
  });

  const availability = await db.inventoryItem.findMany({
    where: { variantId: { in: guestCart.items.map((item) => item.variantId) } },
    select: { variantId: true, quantity: true, reserved: true, allowBackorder: true },
  });
  const availableByVariant = new Map(
    availability.map((item) => [item.variantId, availableUnits(item)]),
  );

  for (const item of guestCart.items) {
    const existing = await db.cartItem.findUnique({
      where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
      select: { id: true, quantity: true },
    });

    const available = availableByVariant.get(item.variantId) ?? 0;
    if (available <= 0) continue;

    const merged = Math.min(
      (existing?.quantity ?? 0) + item.quantity,
      available,
      MAX_QUANTITY_PER_LINE,
    );

    if (existing) {
      await db.cartItem.update({ where: { id: existing.id }, data: { quantity: merged } });
    } else {
      await db.cartItem.create({
        data: { cartId: userCart.id, variantId: item.variantId, quantity: merged },
      });
    }
  }

  await db.cart.delete({ where: { id: guestCart.id } }).catch(() => undefined);

  const store = await cookies();
  store.delete(CART_COOKIE);
}

/** Empty the cart after a successful order. */
export async function clearCart(cartId: string): Promise<void> {
  await db.cartItem.deleteMany({ where: { cartId } });
  await db.cart.update({ where: { id: cartId }, data: { discountCode: null } });
}

export { findCart as findCartForCheckout, MAX_QUANTITY_PER_LINE };
