'use server';

import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { requirePermission } from '@/server/auth/session';
import { createUploadTicket, type UploadTicket } from '@/server/media/cloudinary';

/**
 * Hand the browser a signed upload ticket.
 *
 * Gated on `catalog:write` — the signature is what authorises writing into the
 * shop's media account, so it must not be obtainable by anyone who can merely
 * load an admin page.
 */
export async function createUploadTicketAction(
  input: unknown,
): Promise<ActionResult<UploadTicket>> {
  return run(async () => {
    const { folder } = z
      .object({ folder: z.enum(['products', 'categories']).default('products') })
      .parse(input ?? {});

    await requirePermission('catalog:write');
    return createUploadTicket(folder);
  });
}
