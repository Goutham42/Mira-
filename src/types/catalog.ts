/**
 * View models returned by catalogue services.
 *
 * Deliberately not Prisma payload types: a page should not be able to render a
 * field the service did not intend to expose, and these shapes stay stable when
 * the schema changes underneath them.
 */

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string | null;
  hoverImageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  colors: { value: string; hexColor: string | null }[];
  isSoldOut: boolean;
  isNew: boolean;
};

export type ProductOptionValueData = {
  id: string;
  value: string;
  hexColor: string | null;
};

export type ProductOptionData = {
  id: string;
  name: string;
  values: ProductOptionValueData[];
};

export type ProductVariantData = {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  /** Option value ids, used to match a variant against the shopper's picks. */
  optionValueIds: string[];
  available: number;
  isActive: boolean;
};

export type ProductImageData = {
  id: string;
  url: string;
  alt: string | null;
  colorValue: string | null;
};

export type ProductDetailData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  careInstructions: string | null;
  currency: string;
  basePrice: number;
  compareAtPrice: number | null;
  priceRange: { min: number; max: number };
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  category: { id: string; name: string; slug: string; path: string } | null;
  breadcrumbs: { name: string; href: string }[];
  images: ProductImageData[];
  options: ProductOptionData[];
  variants: ProductVariantData[];
  isSoldOut: boolean;
  rating: { average: number; count: number } | null;
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  path: string;
  imageUrl: string | null;
  productCount: number;
  children: CategoryNode[];
};

export type CatalogFacets = {
  sizes: { value: string; count: number }[];
  colors: { value: string; hexColor: string | null; count: number }[];
  priceRange: { min: number; max: number };
};
