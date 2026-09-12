import 'server-only';
import { randomUUID } from 'node:crypto';
import type { OrderStatus, Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { badRequest, conflict, forbidden, notFound } from '@/server/errors';
import { getCurrentUser, requirePermission, requireUser } from '@/server/auth/session';
import { generateOrderNumber } from '@/lib/order-number';
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit';
import { parsePageParams, paginate } from '@/lib/pagination';
import { logger } from '@/lib/logger';
import type { CheckoutInput } from '@/lib/validation/checkout';
import type {
  OrderAddressSnapshot,
  OrderDetailView,
  OrderSummaryView,
} from '@/types/order';
import { getPaymentProvider } from '@/server/payments';
import { clearCart, getCartView } from './cart.service';
import { computeTotals, validateDiscountCode } from './pricing.service';
import { commitReservations, releaseReservations, reserveStock, restoreCommittedStock } from './inventory.service';
import { recordAudit } from './audit.service';

function toAddressSnapshot(input: CheckoutInput['shippingAddress']): OrderAddressSnapshot {
  return {
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
  };
}

/** Narrow the JSON column back to a shape the UI can render. */
function readAddressSnapshot(value: Prisma.JsonValue): OrderAddressSnapshot {
  const record = (value ?? {}) as Partial<OrderAddressSnapshot>;
  return {
    fullName: record.fullName ?? '',
    phone: record.phone ?? '',
    line1: record.line1 ?? '',
    line2: record.line2 ?? null,
    city: record.city ?? '',
    state: record.state ?? '',
    postalCode: record.postalCode ?? '',
    country: record.country ?? '',
  };
}

export type PlaceOrderResult = {
  orderNumber: string;
  requiresClientAction: boolean;
  clientSecret?: string;
  redirectUrl?: string;
};

/**
 * Turn the cart into an order.
 *
 * Everything that must be atomic is inside one transaction: the order, its
 * snapshot lines, the stock hold and the discount redemption. If any part
 * fails, no stock is held and no order exists.
 *
 * Prices and totals are recomputed here from the database. The `input` carries
 * addresses and intent only — no amounts arrive from the browser.
 */
export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();

  await enforceRateLimit(
    `checkout:${user?.id ?? input.email}`,
    rateLimits.checkout.limit,
    rateLimits.checkout.windowMs,
  );

  const cart = await getCartView();
  if (!cart.id || cart.lines.length === 0) {
    throw badRequest('Your cart is empty.');
  }
  if (cart.hasIssues) {
    throw conflict('Some items in your cart changed. Review your cart and try again.');
  }

  const discount = cart.discount
    ? await validateDiscountCode(
        cart.discount.code,
        cart.lines.reduce((sum, line) => sum + line.lineTotal, 0),
        user?.id ?? null,
      )
    : null;

  // Authoritative totals — recomputed, never trusted from the client.
  const totals = computeTotals(cart.lines, cart.totals.currency, discount);

  const shippingAddress = toAddressSnapshot(input.shippingAddress);
  const billingAddress = input.billingSameAsShipping
    ? shippingAddress
    : toAddressSnapshot(input.billingAddress ?? input.shippingAddress);

  const cartId = cart.id;
  const idempotencyKey = randomUUID();

  const order = await db.$transaction(async (tx) => {
    // Retry on the astronomically unlikely order-number collision.
    let created: { id: string; orderNumber: string } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const orderNumber = generateOrderNumber();
      const clash = await tx.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      });
      if (clash) continue;

      created = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          email: input.email,
          phone: input.phone || null,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          currency: totals.currency,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
          billingAddress: billingAddress as unknown as Prisma.InputJsonValue,
          discountCodeId: discount?.code.id ?? null,
          customerNote: input.customerNote || null,
        },
        select: { id: true, orderNumber: true },
      });
    }
    if (!created) throw conflict('Could not allocate an order number. Please try again.');

    await tx.orderItem.createMany({
      data: cart.lines.map((line) => ({
        orderId: created.id,
        variantId: line.variantId,
        // Snapshots: this order must render correctly years from now.
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        sku: line.sku,
        imageUrl: line.imageUrl,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    });

    // Conditional UPDATE inside this transaction; throws if anyone beat us to
    // the last unit.
    await reserveStock(
      tx,
      cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      created.id,
    );

    if (discount) {
      const claimed = await tx.discountCode.updateMany({
        where: {
          id: discount.code.id,
          isActive: true,
          OR: [{ usageLimit: null }, { usageCount: { lt: discount.code.usageLimit ?? 0 } }],
        },
        data: { usageCount: { increment: 1 } },
      });
      if (claimed.count === 0) {
        throw conflict('That discount code was just fully redeemed.');
      }

      await tx.discountRedemption.create({
        data: {
          discountCodeId: discount.code.id,
          orderId: created.id,
          userId: user?.id ?? null,
          amount: totals.discountTotal,
        },
      });
    }

    await tx.payment.create({
      data: {
        orderId: created.id,
        provider: getPaymentProvider().name,
        status: 'PENDING',
        method: input.paymentMethod,
        amount: totals.grandTotal,
        currency: totals.currency,
        idempotencyKey,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        type: 'CREATED',
        message: `Order placed for ${cart.lines.length} item(s).`,
        actorId: user?.id ?? null,
      },
    });

    return created;
  });

  // --- outside the transaction: talk to the provider ----------------------
  const provider = getPaymentProvider();
  let intent;
  try {
    intent = await provider.createIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: totals.grandTotal,
      currency: totals.currency,
      email: input.email,
      method: input.paymentMethod,
      idempotencyKey,
    });
  } catch (error) {
    // The order exists but cannot be paid; free the stock immediately rather
    // than waiting for the reservation to expire.
    logger.error({ err: error, orderId: order.id }, 'Payment intent creation failed');
    await db.$transaction(async (tx) => {
      await releaseReservations(tx, { orderId: order.id });
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: 'PAYMENT_FAILED',
          message: 'Could not start payment; order cancelled and stock released.',
        },
      });
    });
    throw badRequest('We could not start the payment. Nothing has been charged.');
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId: order.id, idempotencyKey },
      data: { providerPaymentId: intent.providerPaymentId },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'AWAITING_PAYMENT', placedAt: new Date() },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'PAYMENT_STARTED',
        message: `Awaiting payment via ${provider.name} (${input.paymentMethod}).`,
      },
    });
  });

  await clearCart(cartId);

  return {
    orderNumber: order.orderNumber,
    requiresClientAction: intent.requiresClientAction,
    clientSecret: intent.clientSecret,
    redirectUrl: intent.redirectUrl,
  };
}

/**
 * Move an order to PAID and turn stock holds into decrements.
 *
 * Idempotent — a duplicate webhook or a second click in the admin is a no-op.
 * This is the only place that transitions an order into PAID.
 */
export async function markOrderPaid(
  orderId: string,
  options: { actorId?: string | null; note?: string } = {},
): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, orderNumber: true },
    });
    if (!order) throw notFound('Order');
    if (order.paymentStatus === 'PAID') return;

    await commitReservations(tx, orderId);

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentStatus: 'PAID' },
    });

    await tx.payment.updateMany({
      where: { orderId, status: { in: ['PENDING', 'AUTHORIZED'] } },
      data: { status: 'CAPTURED' },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        type: 'PAYMENT_SUCCEEDED',
        message: options.note ?? 'Payment received.',
        actorId: options.actorId ?? null,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const summarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  fulfillmentStatus: true,
  currency: true,
  grandTotal: true,
  placedAt: true,
  createdAt: true,
  items: { select: { quantity: true, imageUrl: true } },
} satisfies Prisma.OrderSelect;

function toSummary(row: Prisma.OrderGetPayload<{ select: typeof summarySelect }>): OrderSummaryView {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    currency: row.currency,
    grandTotal: row.grandTotal,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    placedAt: row.placedAt,
    createdAt: row.createdAt,
    previewImages: row.items
      .map((item) => item.imageUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, 3),
  };
}

export async function listOrdersForCurrentUser(page?: number) {
  const user = await requireUser();
  const params = parsePageParams(page, 10, 10);

  const where = { userId: user.id } satisfies Prisma.OrderWhereInput;

  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: summarySelect,
    }),
    db.order.count({ where }),
  ]);

  return paginate(rows.map(toSummary), total, params);
}

/**
 * Order detail.
 *
 * The ownership check is here rather than in the page, so no route can reach
 * an order it should not — looking up by order number alone would be an IDOR.
 */
export async function getOrderDetail(orderNumber: string): Promise<OrderDetailView> {
  const user = await getCurrentUser();

  const row = await db.order.findUnique({
    where: { orderNumber },
    select: {
      ...summarySelect,
      userId: true,
      email: true,
      phone: true,
      subtotal: true,
      discountTotal: true,
      shippingTotal: true,
      taxTotal: true,
      shippingAddress: true,
      billingAddress: true,
      customerNote: true,
      items: {
        select: {
          id: true,
          productTitle: true,
          variantTitle: true,
          sku: true,
          imageUrl: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
          variant: { select: { product: { select: { slug: true } } } },
        },
      },
      events: { orderBy: { createdAt: 'asc' }, select: { id: true, type: true, message: true, createdAt: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { provider: true, method: true, status: true, amount: true },
      },
    },
  });

  if (!row) throw notFound('Order');

  const isOwner = user !== null && row.userId === user.id;
  const isStaffViewer = user?.role === 'STAFF' || user?.role === 'ADMIN';
  if (!isOwner && !isStaffViewer) {
    // A guest order is reachable only from the confirmation redirect, which
    // knows the number; anything else is a 404 rather than a 403.
    throw notFound('Order');
  }

  const payment = row.payments[0] ?? null;

  return {
    ...toSummary({ ...row, items: row.items }),
    email: row.email,
    phone: row.phone,
    subtotal: row.subtotal,
    discountTotal: row.discountTotal,
    shippingTotal: row.shippingTotal,
    taxTotal: row.taxTotal,
    shippingAddress: readAddressSnapshot(row.shippingAddress),
    billingAddress: readAddressSnapshot(row.billingAddress),
    customerNote: row.customerNote,
    lines: row.items.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      sku: item.sku,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      productSlug: item.variant?.product.slug ?? null,
    })),
    timeline: row.events,
    payment,
  };
}

/**
 * Guest access to a just-placed order.
 *
 * Confirmation is reached by redirect immediately after checkout, so the
 * shopper may not be signed in. Access is limited to orders created in the
 * last hour, which covers the redirect without turning the order number into a
 * permanent bearer token.
 */
export async function getGuestOrderConfirmation(orderNumber: string) {
  const row = await db.order.findUnique({
    where: { orderNumber },
    select: {
      userId: true,
      createdAt: true,
      orderNumber: true,
      email: true,
      status: true,
      paymentStatus: true,
      currency: true,
      grandTotal: true,
      subtotal: true,
      shippingTotal: true,
      taxTotal: true,
      discountTotal: true,
      shippingAddress: true,
      items: {
        select: {
          id: true,
          productTitle: true,
          variantTitle: true,
          imageUrl: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
      },
    },
  });
  if (!row) throw notFound('Order');

  const user = await getCurrentUser();
  const isOwner = user !== null && row.userId === user.id;
  const isRecent = Date.now() - row.createdAt.getTime() < 60 * 60 * 1000;

  if (!isOwner && !isRecent) throw notFound('Order');

  return { ...row, shippingAddress: readAddressSnapshot(row.shippingAddress) };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listOrdersForAdmin(params: {
  status?: OrderStatus;
  q?: string;
  page?: number;
}) {
  await requirePermission('order:read:any');
  const page = parsePageParams(params.page, 25, 25);

  const where: Prisma.OrderWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { orderNumber: { contains: params.q, mode: 'insensitive' } },
            { email: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page.skip,
      take: page.take,
      select: { ...summarySelect, email: true },
    }),
    db.order.count({ where }),
  ]);

  const items = rows.map((row) => ({ ...toSummary(row), email: row.email }));
  return paginate(items, total, page);
}

/**
 * Admin order detail, addressed by id rather than order number.
 *
 * Delegates to `getOrderDetail`, which re-checks visibility — the permission
 * assertion here is the coarse gate, that one is the real check.
 */
export async function getOrderDetailById(orderId: string): Promise<OrderDetailView> {
  await requirePermission('order:read:any');

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });
  if (!order) throw notFound('Order');

  return getOrderDetail(order.orderNumber);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const actor = await requirePermission('order:fulfill');

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true },
  });
  if (!order) throw notFound('Order');
  if (order.status === status) return;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        fulfillmentStatus:
          status === 'SHIPPED' || status === 'DELIVERED' ? 'FULFILLED' : undefined,
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: status === 'SHIPPED' || status === 'DELIVERED' ? 'FULFILLED' : 'STATUS_CHANGED',
        message: `Status changed from ${order.status} to ${status}.`,
        actorId: actor.id,
      },
    });
  });

  await recordAudit({
    actorId: actor.id,
    action: 'order.status',
    entityType: 'Order',
    entityId: orderId,
    before: { status: order.status },
    after: { status },
  });
}

export async function cancelOrder(orderId: string, reason: string) {
  const actor = await requirePermission('order:fulfill');

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentStatus: true, orderNumber: true },
  });
  if (!order) throw notFound('Order');
  if (order.status === 'CANCELLED') return;
  if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
    throw conflict('A shipped order cannot be cancelled; issue a refund instead.');
  }

  await db.$transaction(async (tx) => {
    // Unpaid orders still hold reservations; paid ones already decremented.
    if (order.paymentStatus === 'PAID') {
      await restoreCommittedStock(tx, orderId, 'CANCELLATION');
    } else {
      await releaseReservations(tx, { orderId }, 'CANCELLATION');
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        type: 'CANCELLED',
        message: reason || 'Order cancelled.',
        actorId: actor.id,
      },
    });
  });

  await recordAudit({
    actorId: actor.id,
    action: 'order.cancel',
    entityType: 'Order',
    entityId: orderId,
    after: { reason },
  });
}

/** Record an offline payment (bank transfer, cash on delivery). */
export async function recordManualPayment(orderId: string) {
  const actor = await requirePermission('order:fulfill');

  await markOrderPaid(orderId, {
    actorId: actor.id,
    note: 'Payment recorded manually by staff.',
  });

  await recordAudit({
    actorId: actor.id,
    action: 'order.payment.manual',
    entityType: 'Order',
    entityId: orderId,
  });
}

export async function getOrderStats() {
  await requirePermission('order:read:any');

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [revenue, orderCount, awaitingFulfilment, lowStockCount] = await Promise.all([
    db.order.aggregate({
      where: { paymentStatus: 'PAID', placedAt: { gte: since } },
      _sum: { grandTotal: true },
    }),
    db.order.count({ where: { placedAt: { gte: since } } }),
    db.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    db.inventoryItem.count({ where: { quantity: { lte: 3 }, allowBackorder: false } }),
  ]);

  return {
    revenueMinor: revenue._sum.grandTotal ?? 0,
    orderCount,
    awaitingFulfilment,
    lowStockCount,
  };
}

/** Guard used by the account area before showing order-scoped controls. */
export async function assertOrderVisibleToUser(orderNumber: string) {
  const user = await requireUser();
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { userId: true },
  });
  if (!order) throw notFound('Order');
  if (order.userId !== user.id && user.role === 'CUSTOMER') throw forbidden();
}
