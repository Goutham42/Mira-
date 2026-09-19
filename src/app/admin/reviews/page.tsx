import Link from 'next/link';
import type { ReviewStatus } from '@prisma/client';

import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/commerce/star-rating';
import { Pagination } from '@/components/commerce/pagination';
import { ReviewDecision } from '@/components/admin/review-decision';
import { listReviewsForAdmin } from '@/server/services/review.service';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Reviews' };

const TABS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Published', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
] as const;

const STATUS_BADGE: Record<ReviewStatus, { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
  PENDING: { label: 'Awaiting review', variant: 'warning' },
  APPROVED: { label: 'Published', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
};

function parseStatus(value: string | undefined): ReviewStatus | 'ALL' {
  if (value === 'APPROVED' || value === 'REJECTED' || value === 'ALL') return value;
  return 'PENDING';
}

/**
 * The moderation queue.
 *
 * Reviews are written as PENDING and are invisible on the storefront until
 * someone acts here — without this page a shopper's review would never be
 * seen by anyone.
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);

  const reviews = await listReviewsForAdmin({ status, page: Number(params.page) || 1 });

  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === 'PENDING'
            ? 'Nothing a shopper writes appears on the storefront until it is approved here.'
            : `${reviews.total} review${reviews.total === 1 ? '' : 's'}`}
        </p>
      </header>

      <nav aria-label="Filter reviews" className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.value}
              href={tab.value === 'PENDING' ? '/admin/reviews' : `/admin/reviews?status=${tab.value}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {reviews.items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {status === 'PENDING'
              ? 'Nothing waiting. New reviews land here as shoppers write them.'
              : 'No reviews with that status.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.items.map((review) => {
            const badge = STATUS_BADGE[review.status];

            return (
              <li key={review.id} className="rounded-lg border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/p/${review.product.slug}`}
                      className="font-display text-lg underline-offset-4 hover:underline"
                    >
                      {review.product.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {review.author.name} · {review.author.email} ·{' '}
                      {dateFormat.format(review.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {review.verifiedPurchase ? (
                      <Badge variant="accent">Verified purchase</Badge>
                    ) : (
                      <Badge variant="warning">Not a buyer</Badge>
                    )}
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <StarRating value={review.rating} size="sm" showValue />
                </div>

                {review.title ? <p className="mt-3 font-medium">{review.title}</p> : null}
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>

                <div className="mt-4 border-t pt-4">
                  <ReviewDecision
                    reviewId={review.id}
                    productSlug={review.product.slug}
                    status={review.status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={reviews.page}
        totalPages={reviews.totalPages}
        searchParams={params}
        basePath="/admin/reviews"
      />
    </div>
  );
}
