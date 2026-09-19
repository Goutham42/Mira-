import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
} from '@prisma/client';

export type OrderAddressSnapshot = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderLineView = {
  id: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  productSlug: string | null;
};

export type OrderSummaryView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  grandTotal: number;
  itemCount: number;
  placedAt: Date | null;
  createdAt: Date;
  previewImages: string[];
};

export type OrderTimelineEntry = {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
};

/**
 * A parcel as the shopper sees it.
 *
 * Carries the tracking number as well as the link: carrier URLs rot, and a
 * number can always be pasted into the carrier's own site.
 */
export type OrderShipmentView = {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  lines: { orderItemId: string; title: string; quantity: number }[];
};

export type OrderDetailView = OrderSummaryView & {
  email: string;
  phone: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  shippingAddress: OrderAddressSnapshot;
  billingAddress: OrderAddressSnapshot;
  customerNote: string | null;
  lines: OrderLineView[];
  shipments: OrderShipmentView[];
  timeline: OrderTimelineEntry[];
  payment: {
    provider: string;
    method: string | null;
    status: string;
    amount: number;
  } | null;
};
