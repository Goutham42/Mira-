'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import * as userService from '@/server/services/user.service';

/**
 * Account administration.
 *
 * Each of these revokes the target's sessions inside the service, so the
 * effect is immediate rather than "from their next sign-in".
 */
export async function setCustomerStatusAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { userId, status } = z
      .object({ userId: cuid, status: z.enum(['ACTIVE', 'SUSPENDED']) })
      .parse(input);

    await userService.setUserStatus(userId, status);
    revalidatePath('/admin/customers');
  });
}

export async function setCustomerRoleAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { userId, role } = z
      .object({ userId: cuid, role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']) })
      .parse(input);

    await userService.setUserRole(userId, role);
    revalidatePath('/admin/customers');
  });
}

export async function revokeCustomerSessionsAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { userId } = z.object({ userId: cuid }).parse(input);
    await userService.revokeUserSessions(userId);
    revalidatePath('/admin/customers');
  });
}
