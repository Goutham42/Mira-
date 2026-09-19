'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { run, type ActionResult } from '@/lib/action-result';
import { cuid } from '@/lib/validation/common';
import * as orderService from '@/server/services/order.service';
import * as refundService from '@/server/services/refund.service';
import * as shipmentService from '@/server/services/shipment.service';

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

// ---------------------------------------------------------------------------
// Fulfilment
// ---------------------------------------------------------------------------

const shipmentItemsSchema = z
  .array(z.object({ orderItemId: cuid, quantity: z.coerce.number().int().min(0).max(1000) }))
  .min(1, 'Choose at least one item to ship');

export async function createShipmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsed = z
      .object({
        orderId: cuid,
        carrier: z.string().trim().max(80).optional().or(z.literal('')),
        trackingNumber: z.string().trim().max(120).optional().or(z.literal('')),
        // Validated as a URL because it is rendered as a link in the shopper's
        // email; a malformed one would be a dead end at best.
        trackingUrl: z.string().trim().url('Enter a valid tracking link').optional().or(z.literal('')),
        items: shipmentItemsSchema,
        notify: z.coerce.boolean().default(true),
      })
      .parse(input);

    const result = await shipmentService.createShipment({
      orderId: parsed.orderId,
      carrier: parsed.carrier || null,
      trackingNumber: parsed.trackingNumber || null,
      trackingUrl: parsed.trackingUrl || null,
      items: parsed.items,
      notify: parsed.notify,
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${parsed.orderId}`);
    revalidatePath('/account/orders');
    return result;
  });
}

export async function updateShipmentStatusAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { shipmentId, orderId, status } = z
      .object({
        shipmentId: cuid,
        orderId: cuid,
        status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED']),
      })
      .parse(input);

    await shipmentService.updateShipmentStatus(shipmentId, status);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/account/orders');
  });
}

export async function deleteShipmentAction(input: unknown): Promise<ActionResult<void>> {
  return run(async () => {
    const { shipmentId, orderId } = z.object({ shipmentId: cuid, orderId: cuid }).parse(input);

    await shipmentService.deleteShipment(shipmentId);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/account/orders');
  });
}

/**
 * Record a refund.
 *
 * `amount` arrives in minor units — the form converts from rupees before it
 * gets here, the same way the product editor does.
 */
export async function createRefundAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsed = z
      .object({
        orderId: cuid,
        amount: z.coerce.number().int().positive('Enter an amount to refund'),
        reason: z.string().trim().max(300).optional().or(z.literal('')),
        restock: z
          .array(z.object({ orderItemId: cuid, quantity: z.coerce.number().int().min(0).max(1000) }))
          .default([]),
        notify: z.coerce.boolean().default(true),
      })
      .parse(input);

    const result = await refundService.createRefund({
      orderId: parsed.orderId,
      amount: parsed.amount,
      reason: parsed.reason || null,
      restock: parsed.restock,
      notify: parsed.notify,
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${parsed.orderId}`);
    revalidatePath('/admin/inventory');
    revalidatePath('/account/orders');
    return result;
  });
}
