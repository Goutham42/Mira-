'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import * as wishlistService from '@/server/services/wishlist.service';

const productIdSchema = z.object({ productId: cuid });

export async function toggleWishlistAction(
  input: unknown,
): Promise<ActionResult<{ inWishlist: boolean }>> {
  return run(async () => {
    const { productId } = productIdSchema.parse(input);
    const result = await wishlistService.toggleWishlistItem(productId);
    revalidatePath('/account/wishlist');
    return result;
  });
}

export async function removeFromWishlistAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { productId } = productIdSchema.parse(input);
    await wishlistService.removeFromWishlist(productId);
    revalidatePath('/account/wishlist');
  });
}
