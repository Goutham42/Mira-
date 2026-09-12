'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import * as orderService from '@/server/services/order.service';

const ORDER_STATUSES = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { orderId, status } = z
      .object({ orderId: cuid, status: z.enum(ORDER_STATUSES) })
      .parse(input);

    await orderService.updateOrderStatus(orderId, status);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
  });
}

export async function cancelOrderAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { orderId, reason } = z
      .object({ orderId: cuid, reason: z.string().trim().max(300).default('') })
      .parse(input);

    await orderService.cancelOrder(orderId, reason);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
  });
}

/**
 * Record an offline payment.
 *
 * This is how an order gets paid while no gateway is connected — a staff
 * member confirms the money arrived, which commits the stock reservation and
 * moves the order into fulfilment.
 */
export async function recordManualPaymentAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { orderId } = z.object({ orderId: cuid }).parse(input);
    await orderService.recordManualPayment(orderId);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
  });
}
