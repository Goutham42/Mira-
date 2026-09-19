'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import { discountSchema } from '@/lib/validation/discount';
import * as discountService from '@/server/services/discount.service';

export async function saveDiscountAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsed = discountSchema.parse(input);
    const result = await discountService.saveDiscount(parsed);
    revalidatePath('/admin/discounts');
    return result;
  });
}

export async function setDiscountActiveAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { id, isActive } = z.object({ id: cuid, isActive: z.boolean() }).parse(input);
    await discountService.setDiscountActive(id, isActive);
    revalidatePath('/admin/discounts');
  });
}

export async function deleteDiscountAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { id } = z.object({ id: cuid }).parse(input);
    await discountService.deleteDiscount(id);
    revalidatePath('/admin/discounts');
  });
}
