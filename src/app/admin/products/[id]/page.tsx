import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductForm, type ProductFormDefaults } from '@/components/admin/product-form';
import { getProductForAdmin } from '@/server/services/product.service';
import { listCategoriesForAdmin } from '@/server/services/category.service';
import { isAppError } from '@/server/errors';
import { toMajorUnits } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Edit product' };

/** Minor units back to the decimal string the form edits. */
function toMoneyField(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return '';
  return String(toMajorUnits(minor, siteConfig.currency));
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  try {
    product = await getProductForAdmin(id);
  } catch (error) {
    if (isAppError(error) && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  const categories = await listCategoriesForAdmin();

  // Option order is the source of truth for how a variant's values are keyed.
  const optionIdOrder = product.options.map((option) => option.id);

  const defaults: ProductFormDefaults = {
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    status: product.status,
    categoryId: product.categoryId ?? '',
    brand: product.brand ?? '',
    material: product.material ?? '',
    careInstructions: product.careInstructions ?? '',
    basePrice: toMoneyField(product.basePrice),
    compareAtPrice: toMoneyField(product.compareAtPrice),
    isFeatured: product.isFeatured,
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.alt ?? '',
      colorValue: image.colorValue ?? '',
    })),
    options: product.options.map((option) => ({
      name: option.name,
      valuesRaw: option.values.map((value) => value.value).join(', '),
    })),
    variants: product.variants.map((variant) => {
      const ordered = optionIdOrder.map(
        (optionId) =>
          variant.optionValues.find((link) => link.optionValue.optionId === optionId)
            ?.optionValue.value ?? '',
      );

      return {
        key: ordered.join('|'),
        optionValues: ordered,
        sku: variant.sku,
        price: toMoneyField(variant.price),
        quantity: String(variant.inventoryItem?.quantity ?? 0),
        isActive: variant.isActive,
      };
    }),
  };

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            ← All products
          </Link>
          <h1 className="mt-2 text-3xl">{product.title}</h1>
        </div>

        {product.status === 'ACTIVE' ? (
          <Link
            href={`/p/${product.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline underline-offset-4 hover:text-accent"
          >
            View on storefront
          </Link>
        ) : null}
      </header>

      <ProductForm
        productId={product.id}
        defaults={defaults}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          path: category.path,
        }))}
      />
    </div>
  );
}
