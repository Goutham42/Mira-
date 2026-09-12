import type { FulfillmentStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const ORDER_STATUS: Record<OrderStatus, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING: { label: 'Pending', variant: 'neutral' },
  AWAITING_PAYMENT: { label: 'Awaiting payment', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  PROCESSING: { label: 'Processing', variant: 'accent' },
  SHIPPED: { label: 'Shipped', variant: 'accent' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
  REFUNDED: { label: 'Refunded', variant: 'neutral' },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  UNPAID: { label: 'Unpaid', variant: 'warning' },
  AUTHORIZED: { label: 'Authorised', variant: 'accent' },
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_REFUNDED: { label: 'Partly refunded', variant: 'neutral' },
  REFUNDED: { label: 'Refunded', variant: 'neutral' },
  FAILED: { label: 'Failed', variant: 'destructive' },
};

const FULFILLMENT_STATUS: Record<
  FulfillmentStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  UNFULFILLED: { label: 'Unfulfilled', variant: 'neutral' },
  PARTIALLY_FULFILLED: { label: 'Partly fulfilled', variant: 'warning' },
  FULFILLED: { label: 'Fulfilled', variant: 'success' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = PAYMENT_STATUS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function FulfillmentStatusBadge({ status }: { status: FulfillmentStatus }) {
  const config = FULFILLMENT_STATUS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
