import { z } from 'zod';

import { minorAmount, optionalCuid } from './common';

/**
 * Discount code rules.
 *
 * `value` means different things per type, so the cross-field check is the
 * important part of this schema: a 200% discount or a ₹0 fixed discount are
 * both well-formed integers and both nonsense.
 */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), 'Enter a valid date');

const optionalCount = z
  .union([z.coerce.number().int().min(1, 'Must be at least 1').max(1_000_000), z.literal('')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

export const discountSchema = z
  .object({
    id: optionalCuid,
    code: z
      .string()
      .trim()
      .min(3, 'Use at least 3 characters')
      .max(24, 'Keep the code under 24 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, dash and underscore only')
      .transform((value) => value.toUpperCase()),
    description: z.string().trim().max(200).optional().or(z.literal('')),
    type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
    /** Percent (1–100) for PERCENT, minor units for FIXED, ignored otherwise. */
    value: z.coerce.number().int().nonnegative().max(10_000_000),
    minSubtotal: z
      .union([minorAmount, z.literal('')])
      .optional()
      .transform((value) => (value === '' || value === undefined ? null : value)),
    usageLimit: optionalCount,
    perUserLimit: optionalCount,
    startsAt: optionalDate,
    endsAt: optionalDate,
    isActive: z.coerce.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'PERCENT' && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'A percentage discount must be between 1 and 100',
      });
    }

    if (data.type === 'FIXED' && data.value < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Enter the amount this code takes off',
      });
    }

    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'The end date must be after the start date',
      });
    }
  });

export type DiscountInput = z.infer<typeof discountSchema>;
