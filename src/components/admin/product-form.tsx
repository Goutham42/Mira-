'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { saveProductAction } from '@/actions/admin/catalog';
import { toMinorUnits } from '@/lib/money';
import { ImageUploadButton } from '@/components/admin/image-upload-button';
import { slugify } from '@/lib/slug';
import { siteConfig } from '@/config/site';

/**
 * Product editor.
 *
 * The form works in MAJOR units (rupees) because that is what a merchant types;
 * conversion to the integer minor units the rest of the system uses happens
 * once, on submit. Nothing downstream ever sees a decimal amount.
 */

const moneyField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 2499 or 2499.50');

const formSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(160),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only'),
  shortDescription: z.string().trim().max(300),
  description: z.string().trim().max(20_000),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  categoryId: z.string(),
  brand: z.string().trim().max(80),
  material: z.string().trim().max(200),
  careInstructions: z.string().trim().max(500),
  basePrice: moneyField,
  compareAtPrice: z.string().trim(),
  isFeatured: z.boolean(),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
  images: z.array(
    z.object({
      url: z.string().url('Enter a valid image URL'),
      alt: z.string().trim().max(200),
      colorValue: z.string().trim().max(60),
    }),
  ),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Name the option').max(40),
        // Comma-separated in the UI; split on submit.
        valuesRaw: z.string().trim().min(1, 'Add at least one value'),
      }),
    )
    .min(1, 'Add at least one option'),
  variants: z
    .array(
      z.object({
        key: z.string(),
        optionValues: z.array(z.string()),
        sku: z.string().trim().min(1, 'SKU required').max(60),
        price: moneyField,
        quantity: z.string().trim().regex(/^\d+$/, 'Whole number'),
        isActive: z.boolean(),
      }),
    )
    .min(1, 'Generate at least one variant'),
});

type FormValues = z.infer<typeof formSchema>;

export type ProductFormDefaults = Partial<FormValues> & { id?: string };

export type CategoryOption = { id: string; name: string; path: string };

const EMPTY: FormValues = {
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  status: 'DRAFT',
  categoryId: '',
  brand: '',
  material: '',
  careInstructions: '',
  basePrice: '',
  compareAtPrice: '',
  isFeatured: false,
  seoTitle: '',
  seoDescription: '',
  images: [],
  options: [
    { name: 'Size', valuesRaw: 'XS, S, M, L, XL' },
    { name: 'Color', valuesRaw: '' },
  ],
  variants: [],
};

function splitValues(raw: string): string[] {
  return [...new Set(raw.split(',').map((value) => value.trim()).filter(Boolean))];
}

/** Cartesian product of every option's values, in option order. */
function buildCombinations(valueLists: string[][]): string[][] {
  return valueLists.reduce<string[][]>(
    (acc, values) => acc.flatMap((combo) => values.map((value) => [...combo, value])),
    [[]],
  );
}

export function ProductForm({
  productId,
  defaults,
  categories,
}: {
  productId?: string;
  defaults?: ProductFormDefaults;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...EMPTY, ...defaults },
  });

  const imageFields = useFieldArray({ control, name: 'images' });
  const optionFields = useFieldArray({ control, name: 'options' });
  const variantFields = useFieldArray({ control, name: 'variants' });

  const title = watch('title');
  const status = watch('status');
  const isFeatured = watch('isFeatured');
  const variants = watch('variants');

  const slugPreview = useMemo(() => slugify(watch('slug') || title), [title, watch]);

  /**
   * Rebuild the variant grid from the current options.
   *
   * Rows whose combination still exists keep their SKU, price and stock — the
   * merchant must not lose typed data because they added one colour.
   */
  function regenerateVariants() {
    const options = getValues('options');
    const valueLists = options.map((option) => splitValues(option.valuesRaw));

    if (valueLists.some((list) => list.length === 0)) {
      toast.error('Give every option at least one value first.');
      return;
    }

    const existing = new Map(getValues('variants').map((variant) => [variant.key, variant]));
    const skuBase = (slugPreview || 'sku').toUpperCase().replace(/-/g, '');

    const next = buildCombinations(valueLists).map((combination) => {
      const key = combination.join('|');
      const kept = existing.get(key);
      if (kept) return kept;

      return {
        key,
        optionValues: combination,
        sku: `${skuBase}-${combination.map((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-')}`.slice(
          0,
          60,
        ),
        price: getValues('basePrice') || '',
        quantity: '0',
        isActive: true,
      };
    });

    variantFields.replace(next);
    toast.success(`${next.length} variant${next.length === 1 ? '' : 's'} ready`);
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const currency = siteConfig.currency;

    const optionsPayload = values.options.map((option) => ({
      name: option.name,
      values: splitValues(option.valuesRaw).map((value) => ({ value, hexColor: '' })),
    }));

    const result = await saveProductAction({
      productId,
      product: {
        title: values.title,
        slug: values.slug,
        shortDescription: values.shortDescription,
        description: values.description,
        status: values.status,
        categoryId: values.categoryId,
        brand: values.brand,
        material: values.material,
        careInstructions: values.careInstructions,
        basePrice: toMinorUnits(values.basePrice, currency),
        compareAtPrice: values.compareAtPrice
          ? toMinorUnits(values.compareAtPrice, currency)
          : undefined,
        isFeatured: values.isFeatured,
        seoTitle: values.seoTitle,
        seoDescription: values.seoDescription,
        images: values.images,
        options: optionsPayload,
        variants: values.variants.map((variant) => ({
          sku: variant.sku,
          optionValues: variant.optionValues,
          price: toMinorUnits(variant.price, currency),
          quantity: Number(variant.quantity),
          isActive: variant.isActive,
        })),
      },
    });

    if (!result.ok) {
      setFormError(result.error.message);
      toast.error(result.error.message);
      return;
    }

    toast.success('Product saved');
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10">
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <section className="rounded-lg border bg-surface p-6">
        <h2 className="text-xl">Details</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            htmlFor="title"
            error={errors.title?.message}
            required
            className="sm:col-span-2"
          >
            <Input id="title" invalid={Boolean(errors.title)} {...register('title')} />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            error={errors.slug?.message}
            description={slugPreview ? `/p/${slugPreview}` : 'Generated from the title'}
            className="sm:col-span-2"
          >
            <Input id="slug" placeholder="auto" {...register('slug')} />
          </Field>

          <Field
            label="Short description"
            htmlFor="shortDescription"
            error={errors.shortDescription?.message}
            description="Shown under the title on the product page"
            className="sm:col-span-2"
          >
            <Input id="shortDescription" {...register('shortDescription')} />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
            className="sm:col-span-2"
          >
            <Textarea id="description" rows={6} {...register('description')} />
          </Field>

          <Field label="Category" htmlFor="categoryId" error={errors.categoryId?.message}>
            <select
              id="categoryId"
              className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
              {...register('categoryId')}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.path}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor="status" error={errors.status?.message}>
            <select
              id="status"
              className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
              {...register('status')}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>

          <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
            <Input id="brand" {...register('brand')} />
          </Field>

          <Field label="Fabric" htmlFor="material" error={errors.material?.message}>
            <Input id="material" {...register('material')} />
          </Field>

          <Field
            label="Care instructions"
            htmlFor="careInstructions"
            error={errors.careInstructions?.message}
            className="sm:col-span-2"
          >
            <Input id="careInstructions" {...register('careInstructions')} />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <Checkbox
            id="isFeatured"
            checked={isFeatured}
            onCheckedChange={(checked) => setValue('isFeatured', checked === true)}
          />
          <Label htmlFor="isFeatured" className="font-normal">
            Show on the homepage
          </Label>
        </div>

        {status === 'ACTIVE' ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Saving as Active publishes this product to the storefront immediately.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border bg-surface p-6">
        <h2 className="text-xl">Pricing</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Amounts in {siteConfig.currency}. Each variant can override the price below.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Price"
            htmlFor="basePrice"
            error={errors.basePrice?.message}
            required
          >
            <Input
              id="basePrice"
              inputMode="decimal"
              placeholder="2499"
              invalid={Boolean(errors.basePrice)}
              {...register('basePrice')}
            />
          </Field>

          <Field
            label="Compare-at price"
            htmlFor="compareAtPrice"
            error={errors.compareAtPrice?.message}
            description="Shown struck through. Must be higher than the price."
          >
            <Input id="compareAtPrice" inputMode="decimal" {...register('compareAtPrice')} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl">Images</h2>
          <div className="flex flex-wrap gap-2">
            <ImageUploadButton
              label="Upload photo"
              onUploaded={(url) => imageFields.append({ url, alt: '', colorValue: '' })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageFields.append({ url: '', alt: '', colorValue: '' })}
            >
              <Plus />
              Add URL
            </Button>
          </div>
        </div>

        {imageFields.fields.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No images yet. Upload a photo, or paste the URL of one you host elsewhere. The
            first image is used on product cards.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {imageFields.fields.map((field, index) => (
              <li key={field.id} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <Input
                  placeholder="https://…"
                  aria-label={`Image ${index + 1} URL`}
                  invalid={Boolean(errors.images?.[index]?.url)}
                  {...register(`images.${index}.url`)}
                />
                <Input
                  placeholder="Alt text"
                  aria-label={`Image ${index + 1} alt text`}
                  {...register(`images.${index}.alt`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => imageFields.remove(index)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl">Options</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={optionFields.fields.length >= 3}
            onClick={() => optionFields.append({ name: '', valuesRaw: '' })}
          >
            <Plus />
            Add option
          </Button>
        </div>

        <ul className="mt-5 space-y-4">
          {optionFields.fields.map((field, index) => (
            <li key={field.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input
                placeholder="Size"
                aria-label={`Option ${index + 1} name`}
                invalid={Boolean(errors.options?.[index]?.name)}
                {...register(`options.${index}.name`)}
              />
              <Input
                placeholder="XS, S, M, L"
                aria-label={`Option ${index + 1} values, comma separated`}
                invalid={Boolean(errors.options?.[index]?.valuesRaw)}
                {...register(`options.${index}.valuesRaw`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove option ${index + 1}`}
                disabled={optionFields.fields.length <= 1}
                onClick={() => optionFields.remove(index)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>

        {errors.options?.message ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {errors.options.message}
          </p>
        ) : null}

        <Separator className="my-6" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Variants</h3>
            <p className="text-xs text-muted-foreground">
              {variants.length} combination{variants.length === 1 ? '' : 's'}
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={regenerateVariants}>
            <Wand2 />
            Generate from options
          </Button>
        </div>

        {variantFields.fields.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Set your options, then generate the variant grid.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-3xl text-sm">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="px-2 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    Variant
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    SKU
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    Price
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    Stock
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variantFields.fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="whitespace-nowrap px-2 py-2">
                      {variants[index]?.optionValues.join(' / ')}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-9 w-44"
                        aria-label={`SKU for variant ${index + 1}`}
                        invalid={Boolean(errors.variants?.[index]?.sku)}
                        {...register(`variants.${index}.sku`)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-9 w-28"
                        inputMode="decimal"
                        aria-label={`Price for variant ${index + 1}`}
                        invalid={Boolean(errors.variants?.[index]?.price)}
                        {...register(`variants.${index}.price`)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-9 w-24"
                        inputMode="numeric"
                        aria-label={`Stock for variant ${index + 1}`}
                        invalid={Boolean(errors.variants?.[index]?.quantity)}
                        {...register(`variants.${index}.quantity`)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Variant ${index + 1} active`}
                        className="size-4"
                        {...register(`variants.${index}.isActive`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-surface p-6">
        <h2 className="text-xl">Search engine listing</h2>
        <div className="mt-5 grid gap-4">
          <Field
            label="SEO title"
            htmlFor="seoTitle"
            error={errors.seoTitle?.message}
            description="Up to 70 characters"
          >
            <Input id="seoTitle" {...register('seoTitle')} />
          </Field>
          <Field
            label="SEO description"
            htmlFor="seoDescription"
            error={errors.seoDescription?.message}
            description="Up to 170 characters"
          >
            <Textarea id="seoDescription" rows={3} {...register('seoDescription')} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {productId ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
