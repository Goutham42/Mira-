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
  /**
   * Colour value -> image URL, for swatch previews on the card.
   *
   * Only contains entries for colours that actually have a tagged image
   * (`ProductImage.colorValue`); a colour missing here keeps the default
   * image, so the swatch still selects but the picture does not change.
   */
  colorImages: Record<string, string>;
  isSoldOut: boolean;
  isNew: boolean;
  /** Null when the product has no approved reviews yet. */
  rating: { average: number; count: number } | null;
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

export type ProductReviewData = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  /** First name only — a storefront never exposes a reviewer's full identity. */
  authorName: string;
  verifiedPurchase: boolean;
  createdAt: Date;
};

export type ReviewSummaryData = {
  average: number;
  count: number;
  /** Review count per star, indexed 1-5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

/** What the signed-in shopper is allowed to do on a product's review form. */
export type ReviewEligibility = {
  canReview: boolean;
  reason: 'OK' | 'NOT_SIGNED_IN' | 'ALREADY_REVIEWED' | 'NOT_PURCHASED';
  /** Their own review, whatever its moderation status. */
  existing: { rating: number; title: string | null; body: string; status: string } | null;
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

/**
 * The subset of a product the quick-view modal needs.
 *
 * Derived from `ProductDetailData` rather than declared separately so a field
 * renamed on the detail page cannot silently drift out of the modal.
 */
export type QuickViewData = Pick<
  ProductDetailData,
  | 'id'
  | 'slug'
  | 'title'
  | 'shortDescription'
  | 'currency'
  | 'priceRange'
  | 'compareAtPrice'
  | 'images'
  | 'options'
  | 'variants'
  | 'isSoldOut'
  | 'rating'
>;

export type CatalogFacets = {
  sizes: { value: string; count: number }[];
  colors: { value: string; hexColor: string | null; count: number }[];
  priceRange: { min: number; max: number };
};
