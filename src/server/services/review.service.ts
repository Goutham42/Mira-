import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';

import { db } from '@/server/db';
import { conflict, notFound } from '@/server/errors';
import { getCurrentUser, requireUser } from '@/server/auth/session';
import type {
  ProductReviewData,
  ReviewEligibility,
  ReviewSummaryData,
} from '@/types/catalog';
import type { ReviewInput } from '@/lib/validation/review';

export const REVIEW_TAG = 'reviews';
export const reviewTag = (productId: string) => `reviews:${productId}`;

/** Orders whose items count as a completed purchase for "verified" badges. */
const FULFILLED_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

/**
 * Only the reviewer's first name is ever published. Storing the full name and
 * rendering half of it keeps the account record intact while making the
 * storefront safe to share.
 */
function publicAuthorName(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim();
  if (first) return first;
  const last = lastName?.trim();
  return last ? `${last.charAt(0).toUpperCase()}.` : 'Verified buyer';
}

async function loadReviews(productId: string): Promise<ProductReviewData[]> {
  const rows = await db.productReview.findMany({
    where: { productId, status: 'APPROVED' },
    orderBy: [{ verifiedPurchase: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      verifiedPurchase: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    authorName: publicAuthorName(row.user.firstName, row.user.lastName),
    verifiedPurchase: row.verifiedPurchase,
    createdAt: row.createdAt,
  }));
}

/**
 * Approved reviews for a product.
 *
 * Cached per product and invalidated when a review is written or moderated —
 * the product page renders this on every visit but it changes rarely.
 */
export function getProductReviews(productId: string) {
  return unstable_cache(() => loadReviews(productId), ['product-reviews', productId], {
    tags: [REVIEW_TAG, reviewTag(productId)],
    revalidate: 600,
  })();
}

async function loadSummary(productId: string): Promise<ReviewSummaryData | null> {
  const grouped = await db.productReview.groupBy({
    by: ['rating'],
    where: { productId, status: 'APPROVED' },
    _count: { _all: true },
  });

  if (grouped.length === 0) return null;

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let weighted = 0;

  for (const group of grouped) {
    const stars = Math.min(5, Math.max(1, group.rating)) as 1 | 2 | 3 | 4 | 5;
    const count = group._count._all;
    distribution[stars] += count;
    total += count;
    weighted += stars * count;
  }

  return { average: weighted / total, count: total, distribution };
}

export function getReviewSummary(productId: string) {
  return unstable_cache(() => loadSummary(productId), ['review-summary', productId], {
    tags: [REVIEW_TAG, reviewTag(productId)],
    revalidate: 600,
  })();
}

/**
 * Whether the current shopper may write a review.
 *
 * Reviews are restricted to people who actually bought the product: it is the
 * only cheap defence against review spam, and it is what makes the "Verified
 * purchase" badge mean something.
 */
export async function getReviewEligibility(productId: string): Promise<ReviewEligibility> {
  const user = await getCurrentUser();
  if (!user) return { canReview: false, reason: 'NOT_SIGNED_IN', existing: null };

  const existing = await db.productReview.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { rating: true, title: true, body: true, status: true },
  });

  if (existing) {
    return { canReview: false, reason: 'ALREADY_REVIEWED', existing };
  }

  const purchased = await hasPurchased(productId, user.id);
  return purchased
    ? { canReview: true, reason: 'OK', existing: null }
    : { canReview: false, reason: 'NOT_PURCHASED', existing: null };
}

async function hasPurchased(productId: string, userId: string): Promise<boolean> {
  const item = await db.orderItem.findFirst({
    where: {
      order: { userId, status: { in: [...FULFILLED_STATUSES] } },
      variant: { productId },
    },
    select: { id: true },
  });
  return item !== null;
}

/**
 * Write a review.
 *
 * Lands as PENDING: an unmoderated review box on a public storefront is a spam
 * target, and staff approve from the admin before it is visible.
 */
export async function createReview(input: ReviewInput): Promise<void> {
  const user = await requireUser();

  const product = await db.product.findFirst({
    where: { id: input.productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw notFound('Product');

  const existing = await db.productReview.findUnique({
    where: { productId_userId: { productId: input.productId, userId: user.id } },
    select: { id: true },
  });
  if (existing) throw conflict('You have already reviewed this piece.');

  const verifiedPurchase = await hasPurchased(input.productId, user.id);
  if (!verifiedPurchase) {
    throw conflict('Only shoppers who bought this piece can review it.');
  }

  await db.productReview.create({
    data: {
      productId: input.productId,
      userId: user.id,
      rating: input.rating,
      title: input.title || null,
      body: input.body,
      verifiedPurchase,
      status: 'PENDING',
    },
  });

  revalidateTag(reviewTag(input.productId));
}

/**
 * Average rating and count for many products at once.
 *
 * One grouped query for a whole grid rather than a per-card lookup, so adding
 * stars to a listing costs a single extra round trip.
 */
export async function getRatingsFor(
  productIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  const ratings = new Map<string, { average: number; count: number }>();
  if (productIds.length === 0) return ratings;

  const grouped = await db.productReview.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds }, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const row of grouped) {
    if (row._count._all === 0) continue;
    ratings.set(row.productId, {
      average: Number(row._avg.rating ?? 0),
      count: row._count._all,
    });
  }

  return ratings;
}
