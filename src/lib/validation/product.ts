import { z } from 'zod';
import { cuid, minorAmount, optionalCuid } from './common';

const optionValueSchema = z.object({
  value: z.string().trim().min(1).max(60),
  hexColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour')
    .optional()
    .or(z.literal('')),
});

const optionSchema = z.object({
  name: z.string().trim().min(1).max(40),
  values: z.array(optionValueSchema).min(1, 'Add at least one value').max(50),
});

const variantSchema = z.object({
  id: optionalCuid,
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(60)
    .regex(/^[A-Za-z0-9._-]+$/, 'SKU may contain letters, numbers, dot, dash and underscore')
    .transform((value) => value.toUpperCase()),
  /** Option values in the same order as `options`, e.g. ["M", "Emerald"]. */
  optionValues: z.array(z.string().trim().min(1)).min(1),
  price: minorAmount.min(1, 'Price is required'),
  compareAtPrice: minorAmount.optional(),
  weightGrams: z.coerce.number().int().nonnegative().optional(),
  quantity: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});

const imageSchema = z.object({
  url: z.string().url('Enter a valid image URL'),
  alt: z.string().trim().max(200).optional().or(z.literal('')),
  colorValue: z.string().trim().max(60).optional().or(z.literal('')),
});

export const productSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required').max(160),
    slug: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only')
      .optional()
      .or(z.literal('')),
    shortDescription: z.string().trim().max(300).optional().or(z.literal('')),
    description: z.string().trim().max(20_000).optional().or(z.literal('')),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
    categoryId: cuid.optional().or(z.literal('')),
    brand: z.string().trim().max(80).optional().or(z.literal('')),
    material: z.string().trim().max(200).optional().or(z.literal('')),
    careInstructions: z.string().trim().max(500).optional().or(z.literal('')),
    basePrice: minorAmount.min(1, 'Price is required'),
    compareAtPrice: minorAmount.optional(),
    isFeatured: z.coerce.boolean().default(false),
    seoTitle: z.string().trim().max(70).optional().or(z.literal('')),
    seoDescription: z.string().trim().max(170).optional().or(z.literal('')),
    images: z.array(imageSchema).max(20).default([]),
    options: z.array(optionSchema).min(1, 'Add at least one option').max(3),
    variants: z.array(variantSchema).min(1, 'Add at least one variant').max(200),
  })
  .superRefine((data, ctx) => {
    if (data.compareAtPrice && data.compareAtPrice <= data.basePrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['compareAtPrice'],
        message: 'Compare-at price must be higher than the price',
      });
    }

    const skus = new Set<string>();
    const combinations = new Set<string>();

    data.variants.forEach((variant, index) => {
      if (skus.has(variant.sku)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'sku'],
          message: 'Duplicate SKU',
        });
      }
      skus.add(variant.sku);

      if (variant.optionValues.length !== data.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'optionValues'],
          message: `Expected ${data.options.length} option value(s)`,
        });
        return;
      }

      variant.optionValues.forEach((value, optionIndex) => {
        const option = data.options[optionIndex];
        if (option && !option.values.some((candidate) => candidate.value === value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', index, 'optionValues', optionIndex],
            message: `"${value}" is not a value of ${option.name}`,
          });
        }
      });

      const key = variant.optionValues.join('|');
      if (combinations.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'optionValues'],
          message: 'Duplicate option combination',
        });
      }
      combinations.add(key);
    });
  });

export const productFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(200).optional(),
  sizes: z.array(z.string().trim().max(60)).max(20).default([]),
  colors: z.array(z.string().trim().max(60)).max(20).default([]),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popular']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
});

export const inventoryAdjustmentSchema = z.object({
  variantId: cuid,
  delta: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, 'Enter a non-zero adjustment'),
  reason: z.enum(['ADJUSTMENT', 'RESTOCK', 'RETURN']).default('ADJUSTMENT'),
  note: z.string().trim().max(200).optional().or(z.literal('')),
});

export const categorySchema = z.object({
  id: optionalCuid,
  name: z.string().trim().min(2, 'Name is required').max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only')
    .optional()
    .or(z.literal('')),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  parentId: cuid.optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.coerce.boolean().default(true),
  position: z.coerce.number().int().nonnegative().default(0),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
