import { z } from 'zod';
import { phone } from './common';

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(120),
  phone,
  line1: z.string().trim().min(4, 'Enter the street address').max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Enter the city').max(100),
  state: z.string().trim().min(2, 'Enter the state').max(100),
  postalCode: z
    .string()
    .trim()
    .min(4, 'Enter a valid postal code')
    .max(12)
    .regex(/^[A-Za-z0-9\s-]+$/, 'Enter a valid postal code'),
  country: z.string().trim().length(2, 'Select a country').toUpperCase().default('IN'),
});

export const saveAddressSchema = addressSchema.extend({
  id: z.string().cuid().optional(),
  type: z.enum(['SHIPPING', 'BILLING']).default('SHIPPING'),
  isDefaultShipping: z.coerce.boolean().default(false),
  isDefaultBilling: z.coerce.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type SaveAddressInput = z.infer<typeof saveAddressSchema>;
