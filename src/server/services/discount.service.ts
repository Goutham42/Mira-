import 'server-only';
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { conflict, notFound } from '@/server/errors';
import { requirePermission } from '@/server/auth/session';
import { paginate, parsePageParams } from '@/lib/pagination';
import type { DiscountInput } from '@/lib/validation/discount';
import { recordAudit } from './audit.service';

/**
 * Discount codes.
 *
 * The storefront half of this already existed — `pricing.service` validates a
 * code against the cart and the order transaction records the redemption.
 * This is the other half: creating and retiring codes without a psql prompt.
 *
 * Every function here is admin-only. `discount:write` is deliberately not a
 * staff permission: a code is money, and handing out money is an owner's
 * decision.
 */

export type AdminDiscountRow = {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  minSubtotal: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  /** False when the code is active but outside its window or fully redeemed. */
  isRedeemable: boolean;
  redemptionCount: number;
  createdAt: Date;
};

function isRedeemableNow(row: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
}): boolean {
  if (!row.isActive) return false;
  const now = new Date();
  if (row.startsAt && row.startsAt > now) return false;
  if (row.endsAt && row.endsAt < now) return false;
  if (row.usageLimit !== null && row.usageCount >= row.usageLimit) return false;
  return true;
}

export async function listDiscountsForAdmin(params: { q?: string; page?: number } = {}) {
  await requirePermission('discount:write');

  const page = parsePageParams(params.page, 25, 25);
  const search = params.q?.trim();

  const where: Prisma.DiscountCodeWhereInput = search
    ? {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.discountCode.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip: page.skip,
      take: page.take,
      include: { _count: { select: { redemptions: true } } },
    }),
    db.discountCode.count({ where }),
  ]);

  const items: AdminDiscountRow[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
    type: row.type,
    value: row.value,
    minSubtotal: row.minSubtotal,
    usageLimit: row.usageLimit,
    usageCount: row.usageCount,
    perUserLimit: row.perUserLimit,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
    isRedeemable: isRedeemableNow(row),
    redemptionCount: row._count.redemptions,
    createdAt: row.createdAt,
  }));

  return paginate(items, total, page);
}

/**
 * Create or update a code.
 *
 * `code` is unique, and the friendly conflict matters: the admin typed a code
 * they think is new, and "Unique constraint failed on the fields: (`code`)"
 * is not an answer.
 */
export async function saveDiscount(input: DiscountInput): Promise<{ id: string }> {
  const actor = await requirePermission('discount:write');

  const data = {
    code: input.code,
    description: input.description || null,
    type: input.type,
    // FREE_SHIPPING carries its worth in the shipping line, never as an amount.
    value: input.type === 'FREE_SHIPPING' ? 0 : input.value,
    minSubtotal: input.minSubtotal,
    usageLimit: input.usageLimit,
    perUserLimit: input.perUserLimit,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  };

  const clash = await db.discountCode.findFirst({
    where: { code: data.code, ...(input.id ? { NOT: { id: input.id } } : {}) },
    select: { id: true },
  });
  if (clash) throw conflict(`The code ${data.code} already exists.`);

  if (input.id) {
    const existing = await db.discountCode.findUnique({
      where: { id: input.id },
      select: { id: true, code: true, type: true, value: true, isActive: true },
    });
    if (!existing) throw notFound('Discount code');

    const updated = await db.discountCode.update({ where: { id: input.id }, data });

    await recordAudit({
      actorId: actor.id,
      action: 'discount.update',
      entityType: 'DiscountCode',
      entityId: updated.id,
      before: existing,
      after: data,
    });

    return { id: updated.id };
  }

  const created = await db.discountCode.create({ data });

  await recordAudit({
    actorId: actor.id,
    action: 'discount.create',
    entityType: 'DiscountCode',
    entityId: created.id,
    after: data,
  });

  return { id: created.id };
}

/** Switch a code on or off without losing its redemption history. */
export async function setDiscountActive(id: string, isActive: boolean): Promise<void> {
  const actor = await requirePermission('discount:write');

  const existing = await db.discountCode.findUnique({
    where: { id },
    select: { id: true, code: true, isActive: true },
  });
  if (!existing) throw notFound('Discount code');
  if (existing.isActive === isActive) return;

  await db.discountCode.update({ where: { id }, data: { isActive } });

  await recordAudit({
    actorId: actor.id,
    action: isActive ? 'discount.activate' : 'discount.deactivate',
    entityType: 'DiscountCode',
    entityId: id,
    before: { isActive: existing.isActive },
    after: { isActive },
  });
}

/**
 * Delete a code.
 *
 * Refused once it has been redeemed: `DiscountRedemption` cascades from here,
 * so deleting a used code would quietly erase the record of why those orders
 * were cheaper. Deactivating is the right move, and the error says so.
 */
export async function deleteDiscount(id: string): Promise<void> {
  const actor = await requirePermission('discount:write');

  const existing = await db.discountCode.findUnique({
    where: { id },
    select: { id: true, code: true, _count: { select: { redemptions: true, orders: true } } },
  });
  if (!existing) throw notFound('Discount code');

  if (existing._count.redemptions > 0 || existing._count.orders > 0) {
    throw conflict(
      'This code has been used on real orders. Deactivate it instead so the order history stays intact.',
    );
  }

  await db.discountCode.delete({ where: { id } });

  await recordAudit({
    actorId: actor.id,
    action: 'discount.delete',
    entityType: 'DiscountCode',
    entityId: id,
    before: { code: existing.code },
  });
}
