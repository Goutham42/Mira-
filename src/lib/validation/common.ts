import { z } from 'zod';

export const cuid = z.string().cuid();

export const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254)
  .email('Enter a valid email address')
  // Stored and compared lowercase; there is no citext column.
  .transform((value) => value.toLowerCase());

export const phone = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number')
  .max(20)
  .regex(/^[+0-9][0-9\s\-()]*$/, 'Enter a valid phone number');

/**
 * Password policy: length over composition rules. NIST guidance and every
 * usability study agree that forcing symbols produces weaker, more forgotten
 * passwords than simply requiring length.
 */
export const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'Password is too long');

export const quantity = z.coerce.number().int().min(1, 'Minimum 1').max(20, 'Maximum 20 per item');

export const currencyCode = z.string().length(3).toUpperCase();

/** Positive integer amount in minor units. */
export const minorAmount = z.coerce.number().int().nonnegative();

export const sortOrder = z.enum(['newest', 'price-asc', 'price-desc', 'popular']).default('newest');
