'use server';

import { revalidatePath } from 'next/cache';

import { run, type ActionResult } from '@/lib/action-result';
import {
  addToCartSchema,
  applyDiscountSchema,
  removeCartItemSchema,
  updateCartItemSchema,
} from '@/lib/validation/cart';
import * as cartService from '@/server/services/cart.service';
import type { CartView } from '@/types/cart';

/**
 * Cart mutations.
 *
 * Each action is a thin shell: parse untrusted input with Zod, call the
 * service, refresh the routes that render cart state. No business logic here.
 * Every one returns the full cart so the client can re-render without a second
 * round trip.
 */

function refreshCartRoutes() {
  revalidatePath('/cart');
  revalidatePath('/checkout');
  // The header badge lives in the storefront layout.
  revalidatePath('/', 'layout');
}

export async function addToCartAction(input: unknown): Promise<ActionResult<CartView>> {
  return run(async () => {
    const { variantId, quantity } = addToCartSchema.parse(input);
    const cart = await cartService.addToCart(variantId, quantity);
    refreshCartRoutes();
    return cart;
  });
}

export async function updateCartItemAction(input: unknown): Promise<ActionResult<CartView>> {
  return run(async () => {
    const { itemId, quantity } = updateCartItemSchema.parse(input);
    const cart = await cartService.updateCartItem(itemId, quantity);
    refreshCartRoutes();
    return cart;
  });
}

export async function removeCartItemAction(input: unknown): Promise<ActionResult<CartView>> {
  return run(async () => {
    const { itemId } = removeCartItemSchema.parse(input);
    const cart = await cartService.removeCartItem(itemId);
    refreshCartRoutes();
    return cart;
  });
}

export async function applyDiscountAction(input: unknown): Promise<ActionResult<CartView>> {
  return run(async () => {
    const { code } = applyDiscountSchema.parse(input);
    const cart = await cartService.applyDiscountCode(code);
    refreshCartRoutes();
    return cart;
  });
}

export async function removeDiscountAction(): Promise<ActionResult<CartView>> {
  return run(async () => {
    const cart = await cartService.removeDiscountCode();
    refreshCartRoutes();
    return cart;
  });
}
