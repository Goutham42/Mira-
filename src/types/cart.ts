export type CartLineIssue = 'OUT_OF_STOCK' | 'QUANTITY_REDUCED' | 'UNAVAILABLE';

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** Units actually purchasable right now. */
  available: number;
  /** Set when the line had to be clamped or is no longer buyable. */
  issue: CartLineIssue | null;
};

export type CartTotals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  /** How much more to spend to earn free shipping; null once earned. */
  freeShippingRemaining: number | null;
};

export type AppliedDiscount = {
  code: string;
  description: string | null;
  amount: number;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  totals: CartTotals;
  itemCount: number;
  discount: AppliedDiscount | null;
  hasIssues: boolean;
};
