'use server';

import { revalidatePath } from 'next/cache';

import { run, type ActionResult } from '@/lib/action-result';
import { reviewSchema } from '@/lib/validation/review';
import * as reviewService from '@/server/services/review.service';

export async function submitReviewAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const parsed = reviewSchema.parse(input);
    await reviewService.createReview(parsed);
    revalidatePath('/p/[slug]', 'page');
  });
}
