import 'server-only';

import { db } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { requirePermission } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/server/email/client';
import { refundTemplate } from '@/server/email/templates';
import { recordAudit } from './audit.service';

/**
 * Refunds.
 *
 * `Refund` has been in the schema from the start with nothing writing to it,
 * which meant a cancelled-after-payment order had no way to record that money
 * went back — the order simply sat there contradicting the bank statement.
 *
 * What this does *not* do is move money. No gateway is connected, so a refund
 * here records a transfer a human made, exactly as `recordManualPayment` does
 * in the other direction. When a provider is wired up, `providerRefundId` is
 * the field to fill and the webhook flips `status` from PENDING to SUCCEEDED;
 * nothing else in this file needs to change.
 */

export type RefundView = {
  id: string;
  amount: number;
  reason: string | null;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  createdAt: Date;
};

export type RefundableSummary = {
  currency: string;
  /** Money actually captured against this order. */
  captured: number;
  /** Already refunded or in flight. */
  refunded: number;
  /** captured − refunded; the most a new refund may be. */
  refundable: number;
  refunds: RefundView[];
  lines: { orderItemId: string; title: string; variantTitle: string; quantity: number }[];
};

export type CreateRefundInput = {
  orderId: string;
  amount: number;
  reason?: string | null;
  /** Lines physically back on the shelf. Empty means nothing is restocked. */
  restock: { orderItemId: string; quantity: number }[];
  notify: boolean;
};

/** A refund that is PENDING has not failed — treat it as spoken for. */
const COMMITTED_REFUND_STATUSES = ['PENDING', 'SUCCEEDED'] as const;

async function loadRefundState(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      currency: true,
      status: true,
      grandTotal: true,
      payments: {
        select: {
          id: true,
          status: true,
          amount: true,
          provider: true,
          refunds: { select: { id: true, amount: true, reason: true, status: true, createdAt: true } },
        },
      },
      items: {
        select: {
          id: true,
          productTitle: true,
          variantTitle: true,
          quantity: true,
          variantId: true,
        },
      },
    },
  });
  if (!order) throw notFound('Order');
  return order;
}

export async function getRefundableSummary(orderId: string): Promise<RefundableSummary> {
  await requirePermission('order:refund');

  const order = await loadRefundState(orderId);

  const captured = order.payments
    .filter((payment) => payment.status === 'CAPTURED')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const refunds = order.payments.flatMap((payment) => payment.refunds);

  const refunded = refunds
    .filter((refund) => COMMITTED_REFUND_STATUSES.includes(refund.status as 'PENDING' | 'SUCCEEDED'))
    .reduce((sum, refund) => sum + refund.amount, 0);

  return {
    currency: order.currency,
    captured,
    refunded,
    refundable: Math.max(0, captured - refunded),
    refunds: refunds
      .map((refund) => ({
        id: refund.id,
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    lines: order.items.map((item) => ({
      orderItemId: item.id,
      title: item.productTitle,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
    })),
  };
}

/**
 * Record a refund.
 *
 * The amount is checked against what was actually captured, not against the
 * order total: an order can be paid in more than one transaction, and refunding
 * more than was taken is the one mistake this must make impossible.
 */
export async function createRefund(input: CreateRefundInput): Promise<{ id: string }> {
  const actor = await requirePermission('order:refund');

  const order = await loadRefundState(input.orderId);

  if (input.amount <= 0) throw badRequest('Enter an amount to refund.');

  const capturedPayments = order.payments.filter((payment) => payment.status === 'CAPTURED');
  if (capturedPayments.length === 0) {
    throw conflict('Nothing has been captured on this order, so there is nothing to refund.');
  }

  const captured = capturedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = order.payments
    .flatMap((payment) => payment.refunds)
    .filter((refund) => COMMITTED_REFUND_STATUSES.includes(refund.status as 'PENDING' | 'SUCCEEDED'))
    .reduce((sum, refund) => sum + refund.amount, 0);

  const refundable = captured - refunded;
  if (input.amount > refundable) {
    throw conflict('That is more than is left to refund on this order.');
  }

  // Attach to the largest captured payment: with a single payment this is that
  // payment, and with several it is the one most likely to have the headroom.
  const payment = [...capturedPayments].sort((a, b) => b.amount - a.amount)[0]!;

  const restock = input.restock.filter((line) => line.quantity > 0);
  const itemsById = new Map(order.items.map((item) => [item.id, item]));

  for (const line of restock) {
    const item = itemsById.get(line.orderItemId);
    if (!item) throw badRequest('That item is not on this order.');
    if (line.quantity > item.quantity) {
      throw badRequest(`Only ${item.quantity} of ${item.productTitle} were ordered.`);
    }
  }

  const fullyRefunded = refunded + input.amount >= captured;

  const refund = await db.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amount: input.amount,
        reason: input.reason?.trim() || null,
        // Offline settlement: the money has already moved by the time a human
        // records it here. A gateway would create this as PENDING instead.
        status: 'SUCCEEDED',
        actorId: actor.id,
      },
      select: { id: true },
    });

    for (const line of restock) {
      const item = itemsById.get(line.orderItemId);
      if (!item?.variantId) continue;

      await tx.inventoryItem.update({
        where: { variantId: item.variantId },
        data: { quantity: { increment: line.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          delta: line.quantity,
          reason: 'RETURN',
          referenceId: input.orderId,
          actorId: actor.id,
          note: `Refund on ${order.orderNumber}`,
        },
      });
    }

    await tx.order.update({
      where: { id: input.orderId },
      data: {
        paymentStatus: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        ...(fullyRefunded ? { status: 'REFUNDED' } : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: 'REFUNDED',
        message: input.reason?.trim()
          ? `Refund recorded — ${input.reason.trim()}`
          : 'Refund recorded.',
        actorId: actor.id,
      },
    });

    return created;
  });

  await recordAudit({
    actorId: actor.id,
    action: 'order.refund',
    entityType: 'Refund',
    entityId: refund.id,
    after: {
      orderId: input.orderId,
      amount: input.amount,
      fullyRefunded,
      restocked: restock,
    },
  });

  if (input.notify) {
    const message = refundTemplate({
      orderNumber: order.orderNumber,
      currency: order.currency,
      amount: input.amount,
      reason: input.reason?.trim() || null,
      partial: !fullyRefunded,
    });

    const result = await sendEmail({ to: order.email, ...message });
    if (!result.delivered) {
      logger.warn(
        { orderNumber: order.orderNumber, reason: result.reason },
        'Refund notification not delivered',
      );
    }
  }

  return { id: refund.id };
}
