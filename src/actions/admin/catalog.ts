'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import {
  categorySchema,
  inventoryAdjustmentSchema,
  productSchema,
} from '@/lib/validation/product';
import * as productService from '@/server/services/product.service';
import * as categoryService from '@/server/services/category.service';
import * as inventoryService from '@/server/services/inventory.service';

/**
 * Admin catalogue mutations.
 *
 * Authorization is not performed here — every service called below asserts its
 * own permission. Doing it in one place, at the layer that also touches the
 * database, is what makes it impossible to reach by another route.
 */

const saveProductSchema = z.object({
  productId: cuid.optional(),
  product: productSchema,
});

export async function saveProductAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return run(async () => {
    const { productId, product } = saveProductSchema.parse(input);
    const saved = await productService.saveProduct(product, productId);

    revalidatePath('/admin/products');
    revalidatePath(`/p/${saved.slug}`);

    return { id: saved.id, slug: saved.slug };
  });
}

export async function archiveProductAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { id } = z.object({ id: cuid }).parse(input);
    await productService.archiveProduct(id);
    revalidatePath('/admin/products');
  });
}

export async function saveCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsed = categorySchema.parse(input);
    const saved = await categoryService.saveCategory(parsed);
    revalidatePath('/admin/categories');
    return { id: saved.id };
  });
}

export async function deleteCategoryAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { id } = z.object({ id: cuid }).parse(input);
    await categoryService.deleteCategory(id);
    revalidatePath('/admin/categories');
  });
}

export async function adjustStockAction(
  input: unknown,
): Promise<ActionResult<{ quantity: number }>> {
  return run(async () => {
    const parsed = inventoryAdjustmentSchema.parse(input);
    const result = await inventoryService.adjustStock({
      variantId: parsed.variantId,
      delta: parsed.delta,
      reason: parsed.reason,
      note: parsed.note || null,
    });

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');

    return { quantity: result.quantity };
  });
}
