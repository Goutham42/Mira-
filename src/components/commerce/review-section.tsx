import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';

import { StarRating } from './star-rating';
import { ReviewForm } from './review-form';
import {
  getProductReviews,
  getReviewEligibility,
  getReviewSummary,
} from '@/server/services/review.service';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Reviews block on the product page.
 *
 * A Server Component: the list, the summary and the eligibility check are all
 * server data, and only the write form ships JavaScript.
 */
export async function ReviewSection({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const [summary, reviews, eligibility] = await Promise.all([
    getReviewSummary(productId),
    getProductReviews(productId),
    getReviewEligibility(productId),
  ]);

  return (
    <section id="reviews" className="mt-20 scroll-mt-24 border-t pt-12">
      <h2 className="text-2xl">Reviews</h2>

      <div className="mt-8 grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          {summary ? (
            <>
              <div className="flex items-baseline gap-3">
                <p className="font-display text-5xl leading-none">
                  {summary.average.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">out of 5</p>
              </div>

              <StarRating value={summary.average} size="md" className="mt-3" />

              <p className="mt-2 text-sm text-muted-foreground">
                Based on {summary.count} review{summary.count === 1 ? '' : 's'}
              </p>

              <ul className="mt-6 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((stars) => {
                  const count = summary.distribution[stars];
                  const percent = summary.count > 0 ? (count / summary.count) * 100 : 0;

                  return (
                    <li key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
                        {stars} star
                      </span>
                      <span
                        aria-hidden
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div>
              <p className="font-display text-xl">No reviews yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Be the first to tell other shoppers how this piece fits and feels.
              </p>
            </div>
          )}

          <div className="mt-8">
            {eligibility.canReview ? (
              <ReviewForm productId={productId} />
            ) : (
              <EligibilityNote reason={eligibility.reason} productSlug={productSlug} />
            )}
          </div>
        </div>

        <div>
          {reviews.length > 0 ? (
            <ul className="divide-y border-t">
              {reviews.map((review) => (
                <li key={review.id} className="py-6 first:pt-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <StarRating value={review.rating} />
                    {review.verifiedPurchase ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <BadgeCheck className="size-3.5" strokeWidth={1.6} aria-hidden />
                        Verified purchase
                      </span>
                    ) : null}
                  </div>

                  {review.title ? (
                    <p className="mt-2.5 text-sm font-medium">{review.title}</p>
                  ) : null}

                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {review.body}
                  </p>

                  <p className="mt-3 text-xs text-subtle-foreground">
                    {review.authorName} · {dateFormat.format(review.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t py-10 text-sm text-muted-foreground">
              Once shoppers start reviewing this piece, their notes on fit and fabric will
              appear here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function EligibilityNote({
  reason,
  productSlug,
}: {
  reason: 'OK' | 'NOT_SIGNED_IN' | 'ALREADY_REVIEWED' | 'NOT_PURCHASED';
  productSlug: string;
}) {
  if (reason === 'ALREADY_REVIEWED') {
    return (
      <p className="rounded-lg border bg-surface px-5 py-4 text-sm text-muted-foreground">
        You have already reviewed this piece — thank you.
      </p>
    );
  }

  if (reason === 'NOT_SIGNED_IN') {
    return (
      <p className="rounded-lg border bg-surface px-5 py-4 text-sm text-muted-foreground">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/p/${productSlug}`)}`}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign in
        </Link>{' '}
        to review a piece you have bought.
      </p>
    );
  }

  return (
    <p className="rounded-lg border bg-surface px-5 py-4 text-sm text-muted-foreground">
      Reviews come from shoppers who bought the piece, so you can trust what you read here.
    </p>
  );
}
