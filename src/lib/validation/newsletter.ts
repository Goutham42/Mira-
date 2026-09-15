import { z } from 'zod';

import { email } from './common';

export const newsletterSchema = z.object({
  email,
  /** Which form captured the address, so the two can be told apart later. */
  source: z.string().trim().max(40).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
