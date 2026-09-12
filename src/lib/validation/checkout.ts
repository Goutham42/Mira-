import { z } from 'zod';
import { addressSchema } from './address';
import { email, phone } from './common';

export const checkoutSchema = z
  .object({
    email,
    phone: phone.optional().or(z.literal('')),
    shippingAddress: addressSchema,
    billingSameAsShipping: z.coerce.boolean().default(true),
    billingAddress: addressSchema.optional(),
    customerNote: z.string().trim().max(500).optional().or(z.literal('')),
    // Selected in the UI; the server records intent only until a gateway is wired up.
    paymentMethod: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'COD']),
    // `boolean` refined rather than `literal(true)`: the literal narrows the
    // inferred type to `true`, which the checkbox cannot ever set back to false.
    acceptTerms: z.coerce
      .boolean()
      .refine((value) => value === true, 'Please accept the terms to continue'),
  })
  .refine((data) => data.billingSameAsShipping || data.billingAddress !== undefined, {
    message: 'Enter a billing address',
    path: ['billingAddress'],
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
