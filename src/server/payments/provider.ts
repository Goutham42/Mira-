import 'server-only';
import type { PaymentMethodKind } from '@prisma/client';

/**
 * Payment provider seam.
 *
 * No gateway is integrated yet — that decision is deferred. Everything above
 * this interface (checkout UI, order lifecycle, inventory commitment, refunds)
 * is written against it, so adding Stripe or Razorpay later means implementing
 * this one file and changing `PAYMENT_PROVIDER` in the environment. No page,
 * action or service changes.
 */

export type CreateIntentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  email: string;
  method: PaymentMethodKind;
  idempotencyKey: string;
};

export type PaymentIntentResult = {
  /** Provider-side identifier, null when the provider has no remote object. */
  providerPaymentId: string | null;
  /**
   * True when the browser must do something (card entry, UPI approval, a
   * redirect) before the payment can settle.
   */
  requiresClientAction: boolean;
  /** Opaque token the client SDK needs, when there is one. */
  clientSecret?: string;
  /** Where to send the shopper, for redirect-based methods. */
  redirectUrl?: string;
};

export type RefundInput = {
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  reason?: string;
};

export type RefundResult = {
  providerRefundId: string | null;
  settled: boolean;
};

export type WebhookEvent = {
  id: string;
  type: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'unhandled';
  orderId: string | null;
  providerPaymentId: string | null;
  amount: number | null;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  /** Whether settlement happens later, outside the checkout request. */
  readonly settlesOffline: boolean;

  createIntent(input: CreateIntentInput): Promise<PaymentIntentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  /** Must verify the signature and throw if it does not match. */
  parseWebhook(payload: string, signature: string | null): Promise<WebhookEvent>;
}
