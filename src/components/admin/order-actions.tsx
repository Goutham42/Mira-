'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { OrderStatus, PaymentStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  cancelOrderAction,
  recordManualPaymentAction,
  updateOrderStatusAction,
} from '@/actions/admin/orders';

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; value: OrderStatus }>> = {
  PAID: { label: 'Mark as processing', value: 'PROCESSING' },
  PROCESSING: { label: 'Mark as shipped', value: 'SHIPPED' },
  SHIPPED: { label: 'Mark as delivered', value: 'DELIVERED' },
};

/**
 * Fulfilment controls.
 *
 * "Record payment" is how an order settles while no gateway is connected: it
 * commits the stock reservation and moves the order into fulfilment, the same
 * path a webhook will take later.
 */
export function OrderActions({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const advance = NEXT_STATUS[status];
  const canCancel = status !== 'CANCELLED' && status !== 'SHIPPED' && status !== 'DELIVERED';
  const canRecordPayment = paymentStatus === 'UNPAID' && status !== 'CANCELLED';

  function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? 'Something went wrong');
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canRecordPayment ? (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(() => recordManualPaymentAction({ orderId }), 'Payment recorded')
          }
        >
          Record payment
        </Button>
      ) : null}

      {advance ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(
              () => updateOrderStatusAction({ orderId, status: advance.value }),
              `Order ${advance.value.toLowerCase()}`,
            )
          }
        >
          {advance.label}
        </Button>
      ) : null}

      {canCancel ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setCancelOpen(true)}
          className="text-destructive"
        >
          Cancel order
        </Button>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent
          title="Cancel this order?"
          description="Stock is returned to inventory. This cannot be undone."
        >
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (shown on the order timeline)"
            maxLength={300}
            aria-label="Cancellation reason"
          />

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => {
                setCancelOpen(false);
                run(() => cancelOrderAction({ orderId, reason }), 'Order cancelled');
              }}
            >
              Cancel order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
