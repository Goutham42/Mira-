'use client';

import { useState, useTransition } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ReviewStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { deleteReviewAction, moderateReviewAction } from '@/actions/admin/reviews';

/**
 * The decision controls on one queued review.
 *
 * Approve and reject are both always offered, whatever the review's current
 * state, so a decision can be reversed — the only irreversible control is
 * delete, and that one asks first.
 */
export function ReviewDecision({
  reviewId,
  productSlug,
  status,
}: {
  reviewId: string;
  productSlug: string;
  status: ReviewStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? 'Something went wrong');
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'APPROVED' ? (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(
              () => moderateReviewAction({ reviewId, productSlug, status: 'APPROVED' }),
              'Review published',
            )
          }
        >
          <Check className="size-4" aria-hidden />
          Approve
        </Button>
      ) : null}

      {status !== 'REJECTED' ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(
              () => moderateReviewAction({ reviewId, productSlug, status: 'REJECTED' }),
              status === 'APPROVED' ? 'Review taken down' : 'Review rejected',
            )
          }
        >
          <X className="size-4" aria-hidden />
          {status === 'APPROVED' ? 'Take down' : 'Reject'}
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        className="text-destructive"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete review"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="Delete this review?"
          description="The review is removed permanently. The shopper will be able to write a new one for this piece."
        >
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => {
                setConfirmOpen(false);
                run(() => deleteReviewAction({ reviewId, productSlug }), 'Review deleted');
              }}
            >
              Delete review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
