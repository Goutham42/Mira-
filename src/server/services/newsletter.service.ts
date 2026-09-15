import 'server-only';

import { db } from '@/server/db';
import type { NewsletterInput } from '@/lib/validation/newsletter';

/**
 * Record an email against the list.
 *
 * Idempotent by design: re-submitting a known address succeeds quietly and
 * clears any previous unsubscribe, rather than reporting "already subscribed".
 * Telling a stranger whether an address is on the list leaks membership, and
 * the shopper only cares that it worked.
 */
export async function subscribe(input: NewsletterInput): Promise<void> {
  await db.newsletterSubscriber.upsert({
    where: { email: input.email },
    create: { email: input.email, source: input.source ?? null },
    update: { unsubscribedAt: null },
  });
}
