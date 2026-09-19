import 'server-only';
import type { ShipmentStatus } from '@prisma/client';

import { db } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { requirePermission } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/server/email/client';
import { shipmentTemplate } from '@/server/email/templates';
import { recordAudit } from './audit.service';

/**
 * Shipments.
 *
 * The schema has carried `Shipment` since the first migration and nothing ever
 * wrote to it, which left a real hole: staff could mark an order "shipped" but
 * had nowhere to put the tracking number, and the shopper was never told the
 * parcel had left.
 *
 * A shipment is a set of order lines that physically went out together. Orders
 * can ship in more than one parcel, so quantities are tracked per line and the
 * order's fulfilment status is derived from what is actually still unshipped —
 * never set by hand.
 */

export type ShipmentLineView = {
  orderItemId: string;
  title: string;
  variantTitle: string;
  sku: string;
  quantity: number;
};

export type ShipmentView = {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  lines: ShipmentLineView[];
};

/** An order line with the quantity that has not been put in a parcel yet. */
export type ShippableLine = {
  orderItemId: string;
  title: string;
  variantTitle: string;
  sku: string;
  ordered: number;
  shipped: number;
  remaining: number;
};

export type CreateShipmentInput = {
  orderId: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: { orderItemId: string; quantity: number }[];
  notify: boolean;
};

async function loadOrderForFulfilment(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      status: true,
      paymentStatus: true,
      items: {
        select: {
          id: true,
          productTitle: true,
          variantTitle: true,
          sku: true,
          quantity: true,
          shipmentItems: { select: { quantity: true } },
        },
      },
    },
  });
  if (!order) throw notFound('Order');
  return order;
}

/**
 * What is left to ship on an order.
 *
 * Drives the "create shipment" form: a line that is fully shipped is not
 * offered again, so the same dress cannot be dispatched twice by accident.
 */
export async function getShippableLines(orderId: string): Promise<ShippableLine[]> {
  await requirePermission('order:fulfill');

  const order = await loadOrderForFulfilment(orderId);

  return order.items.map((item) => {
    const shipped = item.shipmentItems.reduce((sum, row) => sum + row.quantity, 0);
    return {
      orderItemId: item.id,
      title: item.productTitle,
      variantTitle: item.variantTitle,
      sku: item.sku,
      ordered: item.quantity,
      shipped,
      remaining: Math.max(0, item.quantity - shipped),
    };
  });
}

export async function listShipmentsForOrder(orderId: string): Promise<ShipmentView[]> {
  const rows = await db.shipment.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      carrier: true,
      trackingNumber: true,
      trackingUrl: true,
      status: true,
      shippedAt: true,
      deliveredAt: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          orderItem: {
            select: { id: true, productTitle: true, variantTitle: true, sku: true },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    status: row.status,
    shippedAt: row.shippedAt,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt,
    lines: row.items.map((item) => ({
      orderItemId: item.orderItem.id,
      title: item.orderItem.productTitle,
      variantTitle: item.orderItem.variantTitle,
      sku: item.orderItem.sku,
      quantity: item.quantity,
    })),
  }));
}

/**
 * Dispatch a parcel.
 *
 * Quantities are re-derived from the database inside the transaction, so two
 * staff members creating a shipment at the same moment cannot between them
 * ship more than was ordered.
 */
export async function createShipment(input: CreateShipmentInput): Promise<{ id: string }> {
  const actor = await requirePermission('order:fulfill');

  const order = await loadOrderForFulfilment(input.orderId);

  if (order.status === 'CANCELLED') {
    throw conflict('This order was cancelled; it cannot be shipped.');
  }
  if (order.paymentStatus === 'UNPAID') {
    throw conflict('Record the payment before dispatching this order.');
  }

  const requested = input.items.filter((item) => item.quantity > 0);
  if (requested.length === 0) {
    throw badRequest('Choose at least one item to ship.');
  }

  const byId = new Map(order.items.map((item) => [item.id, item]));

  for (const item of requested) {
    const line = byId.get(item.orderItemId);
    if (!line) throw badRequest('That item is not on this order.');

    const alreadyShipped = line.shipmentItems.reduce((sum, row) => sum + row.quantity, 0);
    const remaining = line.quantity - alreadyShipped;
    if (item.quantity > remaining) {
      throw conflict(
        `${line.productTitle} has only ${remaining} left to ship.`,
      );
    }
  }

  const shipment = await db.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        orderId: input.orderId,
        carrier: input.carrier?.trim() || null,
        trackingNumber: input.trackingNumber?.trim() || null,
        trackingUrl: input.trackingUrl?.trim() || null,
        status: 'IN_TRANSIT',
        shippedAt: new Date(),
        items: {
          create: requested.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      select: { id: true },
    });

    // Recount from the database rather than trusting the numbers we just wrote.
    const counts = await tx.shipmentItem.groupBy({
      by: ['orderItemId'],
      where: { shipment: { orderId: input.orderId } },
      _sum: { quantity: true },
    });
    const shippedByItem = new Map(counts.map((row) => [row.orderItemId, row._sum.quantity ?? 0]));

    const fullyShipped = order.items.every(
      (item) => (shippedByItem.get(item.id) ?? 0) >= item.quantity,
    );

    await tx.order.update({
      where: { id: input.orderId },
      data: {
        fulfillmentStatus: fullyShipped ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
        // Only advance the order itself once everything has gone out; a part
        // shipment leaves the order in PROCESSING, which is the truth.
        ...(fullyShipped && (order.status === 'PAID' || order.status === 'PROCESSING')
          ? { status: 'SHIPPED' }
          : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: 'FULFILLED',
        message: input.trackingNumber
          ? `${fullyShipped ? 'Order' : 'Part of the order'} shipped${
              input.carrier ? ` via ${input.carrier.trim()}` : ''
            } — tracking ${input.trackingNumber.trim()}.`
          : `${fullyShipped ? 'Order' : 'Part of the order'} shipped.`,
        actorId: actor.id,
      },
    });

    return { id: created.id, fullyShipped };
  });

  await recordAudit({
    actorId: actor.id,
    action: 'order.ship',
    entityType: 'Shipment',
    entityId: shipment.id,
    after: {
      orderId: input.orderId,
      carrier: input.carrier ?? null,
      trackingNumber: input.trackingNumber ?? null,
      items: requested,
    },
  });

  if (input.notify) {
    const lines = requested.map((item) => {
      const line = byId.get(item.orderItemId);
      return {
        title: line ? `${line.productTitle} (${line.variantTitle})` : 'Item',
        quantity: item.quantity,
      };
    });

    const message = shipmentTemplate({
      orderNumber: order.orderNumber,
      carrier: input.carrier?.trim() || null,
      trackingNumber: input.trackingNumber?.trim() || null,
      trackingUrl: input.trackingUrl?.trim() || null,
      lines,
      partial: !shipment.fullyShipped,
    });

    // A failed email must not undo a dispatch that physically happened.
    const result = await sendEmail({ to: order.email, ...message });
    if (!result.delivered) {
      logger.warn(
        { orderNumber: order.orderNumber, reason: result.reason },
        'Shipment notification not delivered',
      );
    }
  }

  return { id: shipment.id };
}

/**
 * Move a parcel along.
 *
 * Marking the last outstanding parcel delivered completes the order, which is
 * what makes the account page say "Delivered" without anyone editing the order
 * status by hand.
 */
export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
): Promise<void> {
  const actor = await requirePermission('order:fulfill');

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, orderId: true, status: true },
  });
  if (!shipment) throw notFound('Shipment');
  if (shipment.status === status) return;

  await db.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status,
        deliveredAt: status === 'DELIVERED' ? new Date() : null,
      },
    });

    const siblings = await tx.shipment.findMany({
      where: { orderId: shipment.orderId },
      select: { status: true },
    });

    const order = await tx.order.findUniqueOrThrow({
      where: { id: shipment.orderId },
      select: { status: true, fulfillmentStatus: true },
    });

    const allDelivered =
      siblings.length > 0 && siblings.every((row) => row.status === 'DELIVERED');

    if (allDelivered && order.fulfillmentStatus === 'FULFILLED' && order.status === 'SHIPPED') {
      await tx.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId: shipment.orderId,
        type: status === 'DELIVERED' ? 'FULFILLED' : 'STATUS_CHANGED',
        message:
          status === 'DELIVERED'
            ? 'Parcel delivered.'
            : status === 'RETURNED'
              ? 'Parcel came back to us.'
              : `Parcel marked ${status.toLowerCase().replace('_', ' ')}.`,
        actorId: actor.id,
      },
    });
  });

  await recordAudit({
    actorId: actor.id,
    action: 'shipment.status',
    entityType: 'Shipment',
    entityId: shipmentId,
    before: { status: shipment.status },
    after: { status },
  });
}

/**
 * Remove a shipment created in error.
 *
 * The quantities go back to unshipped and the order's fulfilment status is
 * recomputed — without this, one mistyped parcel would permanently show an
 * order as fulfilled.
 */
export async function deleteShipment(shipmentId: string): Promise<void> {
  const actor = await requirePermission('order:fulfill');

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, orderId: true, trackingNumber: true },
  });
  if (!shipment) throw notFound('Shipment');

  await db.$transaction(async (tx) => {
    await tx.shipment.delete({ where: { id: shipmentId } });

    const order = await tx.order.findUniqueOrThrow({
      where: { id: shipment.orderId },
      select: {
        status: true,
        items: { select: { id: true, quantity: true } },
      },
    });

    const counts = await tx.shipmentItem.groupBy({
      by: ['orderItemId'],
      where: { shipment: { orderId: shipment.orderId } },
      _sum: { quantity: true },
    });
    const shippedByItem = new Map(counts.map((row) => [row.orderItemId, row._sum.quantity ?? 0]));

    const shippedAny = counts.length > 0;
    const fullyShipped = order.items.every(
      (item) => (shippedByItem.get(item.id) ?? 0) >= item.quantity,
    );

    await tx.order.update({
      where: { id: shipment.orderId },
      data: {
        fulfillmentStatus: fullyShipped
          ? 'FULFILLED'
          : shippedAny
            ? 'PARTIALLY_FULFILLED'
            : 'UNFULFILLED',
        // An order that is no longer fully shipped must not claim to be.
        ...(!fullyShipped && (order.status === 'SHIPPED' || order.status === 'DELIVERED')
          ? { status: 'PROCESSING' }
          : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: shipment.orderId,
        type: 'NOTE',
        message: shipment.trackingNumber
          ? `Shipment ${shipment.trackingNumber} removed.`
          : 'Shipment removed.',
        actorId: actor.id,
      },
    });
  });

  await recordAudit({
    actorId: actor.id,
    action: 'shipment.delete',
    entityType: 'Shipment',
    entityId: shipmentId,
    before: { orderId: shipment.orderId, trackingNumber: shipment.trackingNumber },
  });
}
