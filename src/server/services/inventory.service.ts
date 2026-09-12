import 'server-only';
import type { Prisma, StockMovementReason } from '@prisma/client';

import { db } from '@/server/db';
import { env } from '@/config/env';
import { notFound, outOfStock } from '@/server/errors';
import { requirePermission } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import { recordAudit } from './audit.service';

/** Prisma transaction client — services compose inside a caller's transaction. */
type Tx = Prisma.TransactionClient;

export type StockRequest = { variantId: string; quantity: number };

export function availableUnits(item: {
  quantity: number;
  reserved: number;
  allowBackorder: boolean;
}): number {
  if (item.allowBackorder) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, item.quantity - item.reserved);
}

/** Availability for a set of variants, keyed by variant id. */
export async function getAvailability(variantIds: string[]): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map();

  const items = await db.inventoryItem.findMany({
    where: { variantId: { in: variantIds } },
    select: { variantId: true, quantity: true, reserved: true, allowBackorder: true },
  });

  return new Map(items.map((item) => [item.variantId, availableUnits(item)]));
}

/**
 * Hold stock for an in-flight checkout.
 *
 * The conditional UPDATE is the whole point: the predicate re-checks
 * availability inside the same statement that increments `reserved`, so two
 * shoppers racing for the last dress cannot both succeed. A zero row count
 * means someone else won.
 *
 * Must be called inside a transaction that also creates the order, so a
 * failure anywhere in checkout releases the hold automatically.
 */
export async function reserveStock(
  tx: Tx,
  requests: StockRequest[],
  orderId: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60_000);

  // Reclaim anything already expired on these variants before checking
  // availability. This makes reservations self-healing: the scheduled sweep
  // keeps the table tidy, but stock is never blocked by an abandoned checkout
  // just because the sweep has not run yet.
  await releaseExpiredForVariants(
    tx,
    requests.map((request) => request.variantId),
  );

  for (const request of requests) {
    const updated = await tx.$executeRaw`
      UPDATE "InventoryItem"
      SET "reserved" = "reserved" + ${request.quantity},
          "updatedAt" = NOW()
      WHERE "variantId" = ${request.variantId}
        AND ("allowBackorder" = true
             OR "quantity" - "reserved" >= ${request.quantity})
    `;

    if (updated === 0) {
      const variant = await tx.productVariant.findUnique({
        where: { id: request.variantId },
        select: { sku: true, product: { select: { title: true } } },
      });
      throw outOfStock(
        `${variant?.product.title ?? 'An item'} (${variant?.sku ?? request.variantId}) is no longer available in that quantity.`,
      );
    }

    await tx.inventoryReservation.create({
      data: {
        variantId: request.variantId,
        orderId,
        quantity: request.quantity,
        expiresAt,
        status: 'HELD',
      },
    });
  }
}

/**
 * Convert holds into an actual stock decrement. Called when payment succeeds.
 * Idempotent: only HELD reservations are acted on.
 */
export async function commitReservations(tx: Tx, orderId: string): Promise<void> {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId, status: 'HELD' },
    select: { id: true, variantId: true, quantity: true },
  });

  for (const reservation of reservations) {
    await tx.inventoryItem.update({
      where: { variantId: reservation.variantId },
      data: {
        quantity: { decrement: reservation.quantity },
        reserved: { decrement: reservation.quantity },
      },
    });

    await tx.stockMovement.create({
      data: {
        variantId: reservation.variantId,
        delta: -reservation.quantity,
        reason: 'SALE',
        referenceId: orderId,
      },
    });
  }

  await tx.inventoryReservation.updateMany({
    where: { orderId, status: 'HELD' },
    data: { status: 'COMMITTED' },
  });
}

/**
 * Release expired holds on specific variants.
 *
 * Called on the checkout path so an abandoned cart cannot keep stock locked
 * between scheduled sweeps.
 */
export async function releaseExpiredForVariants(
  tx: Tx,
  variantIds: string[],
): Promise<number> {
  if (variantIds.length === 0) return 0;

  const expired = await tx.inventoryReservation.findMany({
    where: {
      status: 'HELD',
      expiresAt: { lt: new Date() },
      variantId: { in: variantIds },
    },
    select: { id: true },
  });
  if (expired.length === 0) return 0;

  return releaseReservations(
    tx,
    { ids: expired.map((reservation) => reservation.id) },
    'RESERVATION_EXPIRY',
  );
}

/** Give held units back. Used on cancellation and on reservation expiry. */
export async function releaseReservations(
  tx: Tx,
  where: { orderId?: string; ids?: string[] },
  reason: StockMovementReason = 'CANCELLATION',
): Promise<number> {
  const reservations = await tx.inventoryReservation.findMany({
    where: {
      status: 'HELD',
      ...(where.orderId ? { orderId: where.orderId } : {}),
      ...(where.ids ? { id: { in: where.ids } } : {}),
    },
    select: { id: true, variantId: true, quantity: true, orderId: true },
  });

  for (const reservation of reservations) {
    await tx.inventoryItem.update({
      where: { variantId: reservation.variantId },
      data: { reserved: { decrement: reservation.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        variantId: reservation.variantId,
        delta: 0,
        reason,
        referenceId: reservation.orderId,
        note: `Released reservation ${reservation.id}`,
      },
    });
  }

  if (reservations.length > 0) {
    await tx.inventoryReservation.updateMany({
      where: { id: { in: reservations.map((r) => r.id) } },
      data: { status: 'RELEASED' },
    });
  }

  return reservations.length;
}

/**
 * Sweep expired holds. Driven by /api/cron/release-reservations; without it,
 * abandoned checkouts would keep stock locked forever.
 */
export async function releaseExpiredReservations(batchSize = 200): Promise<number> {
  const expired = await db.inventoryReservation.findMany({
    where: { status: 'HELD', expiresAt: { lt: new Date() } },
    take: batchSize,
    select: { id: true },
  });
  if (expired.length === 0) return 0;

  const released = await db.$transaction((tx) =>
    releaseReservations(tx, { ids: expired.map((r) => r.id) }, 'RESERVATION_EXPIRY'),
  );

  logger.info({ released }, 'Released expired inventory reservations');
  return released;
}

/** Restore stock for a cancelled or refunded order that was already committed. */
export async function restoreCommittedStock(
  tx: Tx,
  orderId: string,
  reason: StockMovementReason = 'CANCELLATION',
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true },
  });

  for (const item of items) {
    if (!item.variantId) continue;
    await tx.inventoryItem.update({
      where: { variantId: item.variantId },
      data: { quantity: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        delta: item.quantity,
        reason,
        referenceId: orderId,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adjustStock(input: {
  variantId: string;
  delta: number;
  reason: StockMovementReason;
  note?: string | null;
}) {
  const actor = await requirePermission('inventory:write');

  const result = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { variantId: input.variantId },
      select: { quantity: true },
    });
    if (!item) throw notFound('Inventory record');

    const next = item.quantity + input.delta;
    if (next < 0) {
      throw outOfStock('That adjustment would take stock below zero.');
    }

    const updated = await tx.inventoryItem.update({
      where: { variantId: input.variantId },
      data: { quantity: next },
      select: { quantity: true, reserved: true },
    });

    await tx.stockMovement.create({
      data: {
        variantId: input.variantId,
        delta: input.delta,
        reason: input.reason,
        actorId: actor.id,
        note: input.note ?? null,
      },
    });

    return updated;
  });

  await recordAudit({
    actorId: actor.id,
    action: 'inventory.adjust',
    entityType: 'ProductVariant',
    entityId: input.variantId,
    after: { delta: input.delta, reason: input.reason, quantity: result.quantity },
  });

  return result;
}

export async function listInventory(params: { search?: string } = {}) {
  await requirePermission('catalog:read');

  return db.inventoryItem.findMany({
    where: {
      variant: {
        product: { deletedAt: null },
        ...(params.search
          ? {
              OR: [
                { sku: { contains: params.search, mode: 'insensitive' } },
                { product: { title: { contains: params.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
    },
    orderBy: [{ quantity: 'asc' }],
    take: 200,
    select: {
      variantId: true,
      quantity: true,
      reserved: true,
      lowStockThreshold: true,
      allowBackorder: true,
      variant: {
        select: {
          sku: true,
          product: { select: { id: true, title: true, slug: true } },
          optionValues: { select: { optionValue: { select: { value: true } } } },
        },
      },
    },
  });
}
