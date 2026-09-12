import type { FulfillmentStatus, OrderStatus, PaymentStatus } from '@prisma/client';

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
  timeline: OrderTimelineEntry[];
  payment: {
    provider: string;
    method: string | null;
    status: string;
    amount: number;
  } | null;
};
