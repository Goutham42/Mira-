'use server';

import { run, type ActionResult } from '@/lib/action-result';
import { newsletterSchema } from '@/lib/validation/newsletter';
import * as newsletterService from '@/server/services/newsletter.service';

export async function subscribeAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const parsed = newsletterSchema.parse(input);
    await newsletterService.subscribe(parsed);
  });
}
