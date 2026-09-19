import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '@/lib/validation/checkout';

const EMPTY_ADDRESS = {
  fullName: '', phone: '', line1: '', line2: '',
  city: '', state: '', postalCode: '', country: 'IN',
};

const shipping = {
  fullName: 'Asha Menon', phone: '9876543210', line1: '12 Test Street', line2: '',
  city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641001', country: 'IN',
};

describe('checkout with billing same as shipping', () => {
  it('accepts what the form actually submits', () => {
    const result = checkoutSchema.safeParse({
      email: 'shopper@example.com',
      phone: '9876543210',
      shippingAddress: shipping,
      billingSameAsShipping: true,
      // The form keeps its untouched default here while the fields are hidden.
      billingAddress: EMPTY_ADDRESS,
      customerNote: '',
      paymentMethod: 'COD',
      acceptTerms: true,
    });

    // Name the offending paths in the failure message rather than just
    // "expected false to be true" — this is the assertion most likely to
    // regress, and the paths are the whole diagnosis.
    const paths = result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join('.'));

    expect(paths, 'billing address should not be validated when hidden').toEqual([]);
    expect(result.success).toBe(true);
  });
});

describe('checkout with a separate billing address', () => {
  const base = {
    email: 'shopper@example.com',
    phone: '9876543210',
    shippingAddress: shipping,
    customerNote: '',
    paymentMethod: 'COD' as const,
    acceptTerms: true,
  };

  it('still validates the billing address when it differs', () => {
    const result = checkoutSchema.safeParse({
      ...base,
      billingSameAsShipping: false,
      billingAddress: EMPTY_ADDRESS,
    });

    // Now the fields are on screen, so failing them is correct and the errors
    // have somewhere to render.
    expect(result.success).toBe(false);
  });

  it('accepts a complete separate billing address', () => {
    const result = checkoutSchema.safeParse({
      ...base,
      billingSameAsShipping: false,
      billingAddress: { ...shipping, fullName: 'Someone Else' },
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.billingAddress?.fullName).toBe('Someone Else');
  });

  it('refuses an order with the terms unaccepted', () => {
    const result = checkoutSchema.safeParse({
      ...base,
      billingSameAsShipping: true,
      billingAddress: EMPTY_ADDRESS,
      acceptTerms: false,
    });

    expect(result.success).toBe(false);
  });
});
