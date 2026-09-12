'use client';

import { Banknote, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PaymentMethodValue = 'CARD' | 'UPI' | 'NETBANKING' | 'WALLET' | 'COD';

const METHODS: {
  value: PaymentMethodValue;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'CARD',
    label: 'Card',
    description: 'Credit or debit card',
    icon: CreditCard,
  },
  { value: 'UPI', label: 'UPI', description: 'Pay from any UPI app', icon: Smartphone },
  {
    value: 'NETBANKING',
    label: 'Net banking',
    description: 'Pay directly from your bank',
    icon: Landmark,
  },
  { value: 'WALLET', label: 'Wallet', description: 'Paytm, PhonePe and others', icon: Wallet },
  {
    value: 'COD',
    label: 'Cash on delivery',
    description: 'Pay the courier when it arrives',
    icon: Banknote,
  },
];

/**
 * Payment method chooser.
 *
 * No gateway is connected yet, so nothing here collects card details — and it
 * should not. Raw card numbers must never touch our servers; when a provider is
 * chosen, its hosted element (Stripe Payment Element, Razorpay Checkout) mounts
 * in the panel below, which keeps us out of PCI scope. The selection is
 * recorded on the order either way, so this UI does not change then.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  settlesOffline,
}: {
  value: PaymentMethodValue;
  onChange: (value: PaymentMethodValue) => void;
  /** True while the store settles payments manually. */
  settlesOffline: boolean;
}) {
  const selected = METHODS.find((method) => method.value === value);

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Payment method" className="grid gap-2">
        {METHODS.map((method) => {
          const Icon = method.icon;
          const active = method.value === value;

          return (
            <button
              key={method.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(method.value)}
              className={cn(
                'flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors',
                active
                  ? 'border-foreground bg-surface-muted'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border',
                  active ? 'border-foreground' : 'border-border-strong',
                )}
              >
                {active ? <span className="size-2 rounded-full bg-foreground" /> : null}
              </span>

              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />

              <span className="min-w-0">
                <span className="block text-sm">{method.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {method.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Where the provider's hosted payment element will mount. */}
      <div className="rounded-md border border-dashed bg-surface-muted/50 px-4 py-4">
        {value === 'COD' ? (
          <p className="text-sm text-muted-foreground">
            Pay the courier in cash when your order arrives. We will confirm the order by
            email straight away.
          </p>
        ) : settlesOffline ? (
          <p className="text-sm text-muted-foreground">
            Your order will be placed and held, and we will email you payment instructions
            for {selected?.label.toLowerCase()}. Nothing is charged now.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            You will complete payment securely on the next step.
          </p>
        )}
      </div>
    </div>
  );
}
