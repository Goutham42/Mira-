import 'server-only';
import { env } from '@/config/env';
import { manualPaymentProvider } from './manual.provider';
import type { PaymentProvider } from './provider';

const providers: Record<string, PaymentProvider> = {
  manual: manualPaymentProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const provider = providers[env.PAYMENT_PROVIDER];
  if (!provider) {
    throw new Error(`Unknown PAYMENT_PROVIDER "${env.PAYMENT_PROVIDER}"`);
  }
  return provider;
}

export type { PaymentProvider } from './provider';
