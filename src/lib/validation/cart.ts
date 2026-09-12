import { z } from 'zod';
import { cuid, quantity } from './common';

export const addToCartSchema = z.object({
  variantId: cuid,
  quantity: quantity.default(1),
});

export const updateCartItemSchema = z.object({
  itemId: cuid,
  // 0 removes the line, which is what a stepper stepping down to zero means.
  quantity: z.coerce.number().int().min(0).max(20),
});

export const removeCartItemSchema = z.object({ itemId: cuid });

export const applyDiscountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Enter a valid code')
    .max(40)
    .transform((value) => value.toUpperCase()),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
