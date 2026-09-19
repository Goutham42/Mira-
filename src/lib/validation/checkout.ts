import { z } from 'zod';
import { addressSchema } from './address';
import { email, phone } from './common';

/**
 * Drop the billing address when it is the same as shipping.
 *
 * The checkout form keeps a blank billing address in its state while those
 * fields are hidden behind "Same as shipping address". An object of empty
 * strings is not the same as no object at all, so `addressSchema.optional()`
 * validated it and failed every required field — and because the fields were
 * hidden, there was nowhere to render a single one of those errors. The form
 * simply refused to submit and no order could be placed, by anyone.
 *
 * Doing this in the schema rather than in the form means the Server Action
 * gets the same treatment when it re-parses the payload.
 */
function dropUnusedBillingAddress(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;

  const input = value as Record<string, unknown>;
  if (input.billingSameAsShipping === false) return value;

  const { billingAddress: _unused, ...rest } = input;
  return rest;
}

export const checkoutSchema = z.preprocess(
  dropUnusedBillingAddress,
  z
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
    }),
);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
