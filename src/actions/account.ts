'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid, phone } from '@/lib/validation/common';
import { saveAddressSchema } from '@/lib/validation/address';
import { changePasswordSchema } from '@/lib/validation/auth';
import * as userService from '@/server/services/user.service';

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().max(60).optional().or(z.literal('')),
  phone: phone.optional().or(z.literal('')),
  marketingOptIn: z.coerce.boolean().default(false),
});

export async function updateProfileAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const parsed = profileSchema.parse(input);
    await userService.updateProfile(parsed);
    revalidatePath('/account/profile');
    revalidatePath('/account');
  });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const parsed = changePasswordSchema.parse(input);
    await userService.changePassword(parsed.currentPassword, parsed.password);
  });
}

export async function saveAddressAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const parsed = saveAddressSchema.parse(input);
    await userService.saveAddress(parsed);
    revalidatePath('/account/addresses');
    revalidatePath('/checkout');
  });
}

export async function deleteAddressAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { id } = z.object({ id: cuid }).parse(input);
    await userService.deleteAddress(id);
    revalidatePath('/account/addresses');
  });
}
