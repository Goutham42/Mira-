import { z } from 'zod';

import { cuid } from './common';

export const reviewSchema = z.object({
  productId: cuid,
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Choose a rating')
    .max(5, 'Choose a rating'),
  title: z.string().trim().max(120, 'Keep the title under 120 characters').optional(),
  body: z
    .string()
    .trim()
    .min(10, 'Tell us a little more — at least 10 characters')
    .max(2000, 'Keep your review under 2000 characters'),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
