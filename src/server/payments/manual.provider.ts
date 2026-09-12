import 'server-only';
import { AppError } from '@/server/errors';
import type {
  CreateIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  WebhookEvent,
} from './provider';

/**
 * Offline settlement.
 *
 * This is a working provider, not a stub: the order is placed, stock is held,
 * the confirmation email goes out and the order sits in AWAITING_PAYMENT until
 * a staff member marks it paid in the admin — exactly how cash-on-delivery and
 * bank-transfer orders behave in a real shop.
 *
 * It is the default until a gateway is chosen.
 */
export const manualPaymentProvider: PaymentProvider = {
  name: 'manual',
  settlesOffline: true,

  async createIntent(input: CreateIntentInput): Promise<PaymentIntentResult> {
    // Nothing to call out to; the order itself is the record of intent.
    return {
      providerPaymentId: `manual_${input.orderNumber}`,
      requiresClientAction: false,
    };
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    // A refund is recorded here and actually paid out by hand. `settled: false`
    // keeps the refund PENDING so it shows up as outstanding work.
    return {
      providerRefundId: input.providerPaymentId
        ? `manual_refund_${input.providerPaymentId}`
        : null,
      settled: false,
    };
  },

  async parseWebhook(): Promise<WebhookEvent> {
    // No gateway means no legitimate webhook source. Refusing outright is the
    // safe default: an endpoint that accepts unverifiable "payment succeeded"
    // calls would let anyone mark any order paid.
    throw new AppError('FORBIDDEN', 'No payment gateway is configured.');
  },
};
