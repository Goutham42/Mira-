'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import * as reviewService from '@/server/services/review.service';

/**
 * Review moderation.
 *
 * Every decision revalidates both the queue and the product page: a review is
 * only worth approving if it appears on the storefront straight away, and the
 * service has already invalidated the cached review list by tag.
 */
export async function moderateReviewAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { reviewId, status, productSlug } = z
      .object({
        reviewId: cuid,
        status: z.enum(['APPROVED', 'REJECTED']),
        productSlug: z.string().trim().min(1),
      })
      .parse(input);

    await reviewService.moderateReview(reviewId, status);
    revalidatePath('/admin/reviews');
    revalidatePath(`/p/${productSlug}`);
  });
}

export async function deleteReviewAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { reviewId, productSlug } = z
      .object({ reviewId: cuid, productSlug: z.string().trim().min(1) })
      .parse(input);

    await reviewService.deleteReview(reviewId);
    revalidatePath('/admin/reviews');
    revalidatePath(`/p/${productSlug}`);
  });
}
