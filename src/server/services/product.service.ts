import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { conflict, notFound } from '@/server/errors';
import { requirePermission } from '@/server/auth/session';
import { uniqueSlug } from '@/lib/slug';
import { parsePageParams, paginate, type Paginated } from '@/lib/pagination';
import { buildSearchTokens } from '@/lib/search-terms';
import type { ProductInput } from '@/lib/validation/product';
import type {
  CatalogFacets,
  ProductCardData,
  ProductDetailData,
} from '@/types/catalog';
import { CATEGORY_TAG, getBreadcrumbsForPath } from './category.service';
import { recordAudit } from './audit.service';
import { availableUnits } from './inventory.service';
import { getRatingsFor, REVIEW_TAG } from './review.service';

export const PRODUCT_TAG = 'products';
export const productTag = (slug: string) => `product:${slug}`;

const NEW_ARRIVAL_DAYS = 30;

const OPTION_NAME_SIZE = 'Size';
const OPTION_NAME_COLOR = 'Color';

/** Only published, non-deleted products are ever visible to a shopper. */
const publicProductWhere = {
  deletedAt: null,
  status: 'ACTIVE',
  publishedAt: { not: null, lte: new Date() },
} satisfies Prisma.ProductWhereInput;

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  basePrice: true,
  compareAtPrice: true,
  currency: true,
  publishedAt: true,
  images: {
    orderBy: { position: 'asc' },
    take: 2,
    select: { url: true, alt: true },
  },
  variants: {
    where: { isActive: true },
    select: {
      price: true,
      inventoryItem: {
        select: { quantity: true, reserved: true, allowBackorder: true },
      },
      optionValues: {
        select: {
          optionValue: {
            select: { value: true, hexColor: true, option: { select: { name: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function toProductCard(row: CardRow): ProductCardData {
  const prices = row.variants.map((variant) => variant.price);
  const price = prices.length > 0 ? Math.min(...prices) : row.basePrice;

  const isSoldOut =
    row.variants.length === 0 ||
    row.variants.every(
      (variant) => !variant.inventoryItem || availableUnits(variant.inventoryItem) <= 0,
    );

  // De-duplicate colours across variants, preserving first-seen order.
  const colors = new Map<string, string | null>();
  for (const variant of row.variants) {
    for (const link of variant.optionValues) {
      if (link.optionValue.option.name !== OPTION_NAME_COLOR) continue;
      if (!colors.has(link.optionValue.value)) {
        colors.set(link.optionValue.value, link.optionValue.hexColor);
      }
    }
  }

  const [primaryImage, hoverImage] = row.images;
  const publishedAt = row.publishedAt;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    imageUrl: primaryImage?.url ?? null,
    imageAlt: primaryImage?.alt ?? row.title,
    hoverImageUrl: hoverImage?.url ?? null,
    price,
    compareAtPrice: row.compareAtPrice,
    currency: row.currency,
    colors: [...colors].map(([value, hexColor]) => ({ value, hexColor })),
    isSoldOut,
    isNew:
      publishedAt !== null &&
      Date.now() - publishedAt.getTime() < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000,
    // Filled in by `withRatings`; one grouped query per grid rather than per card.
    rating: null,
  };
}

/**
 * Attach review averages to a page of cards.
 *
 * Kept separate from `toProductCard` so the rating costs exactly one extra
 * query per grid, no matter how many cards are on it.
 */
async function withRatings(cards: ProductCardData[]): Promise<ProductCardData[]> {
  if (cards.length === 0) return cards;
  const ratings = await getRatingsFor(cards.map((card) => card.id));
  if (ratings.size === 0) return cards;
  return cards.map((card) => ({ ...card, rating: ratings.get(card.id) ?? null }));
}

export type ListProductsParams = {
  categoryPath?: string;
  q?: string;
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  /** Hide products with nothing sellable left. */
  inStockOnly?: boolean;
  page?: number;
  pageSize?: number;
};

function buildProductWhere(params: ListProductsParams): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [publicProductWhere];

  if (params.categoryPath) {
    // Materialised path makes "this category and everything under it" a single
    // indexed prefix match.
    and.push({
      category: {
        OR: [{ path: params.categoryPath }, { path: { startsWith: `${params.categoryPath}/` } }],
      },
    });
  }

  if (params.q) {
    /**
     * Every word must match something, but each word may match any field and
     * any of its synonyms — so "blue kurti" needs both, while "chudidhar"
     * still finds a churidar and "tops" still finds a piece titled "Top".
     */
    for (const token of buildSearchTokens(params.q)) {
      const alternatives: Prisma.ProductWhereInput[] = [];

      for (const variant of token.variants) {
        alternatives.push(
          { title: { contains: variant, mode: 'insensitive' } },
          { shortDescription: { contains: variant, mode: 'insensitive' } },
          { description: { contains: variant, mode: 'insensitive' } },
          { brand: { contains: variant, mode: 'insensitive' } },
          { material: { contains: variant, mode: 'insensitive' } },
          { category: { name: { contains: variant, mode: 'insensitive' } } },
          {
            variants: {
              some: {
                isActive: true,
                optionValues: {
                  some: { optionValue: { value: { contains: variant, mode: 'insensitive' } } },
                },
              },
            },
          },
        );
      }

      and.push({ OR: alternatives });
    }
  }

  // Each facet group is ANDed with the others but ORed within itself, which is
  // what a shopper expects from "size M or L, in black".
  if (params.sizes?.length) {
    and.push({
      variants: {
        some: {
          isActive: true,
          optionValues: {
            some: {
              optionValue: {
                value: { in: params.sizes },
                option: { name: OPTION_NAME_SIZE },
              },
            },
          },
        },
      },
    });
  }

  if (params.colors?.length) {
    and.push({
      variants: {
        some: {
          isActive: true,
          optionValues: {
            some: {
              optionValue: {
                value: { in: params.colors },
                option: { name: OPTION_NAME_COLOR },
              },
            },
          },
        },
      },
    });
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    and.push({
      basePrice: {
        ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
        ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
      },
    });
  }

  if (params.inStockOnly) {
    /**
     * Mirrors `availableUnits`: backorderable stock always counts as
     * available, otherwise a variant needs unreserved units left. Expressed as
     * a column-to-column comparison so the database does the filtering — doing
     * it in `toProductCard` would break pagination, because the page would be
     * sliced before the sold-out rows were removed.
     */
    and.push({
      variants: {
        some: {
          isActive: true,
          inventoryItem: {
            OR: [
              { allowBackorder: true },
              { quantity: { gt: db.inventoryItem.fields.reserved } },
            ],
          },
        },
      },
    });
  }

  return { AND: and };
}

function buildOrderBy(
  sort: ListProductsParams['sort'],
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ basePrice: 'asc' }, { id: 'asc' }];
    case 'price-desc':
      return [{ basePrice: 'desc' }, { id: 'asc' }];
    case 'popular':
      // No sales-velocity column yet; merchandising flag is the honest proxy.
      return [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }];
    case 'newest':
    default:
      return [{ publishedAt: 'desc' }, { id: 'asc' }];
  }
}

export async function listProducts(
  params: ListProductsParams,
): Promise<Paginated<ProductCardData>> {
  const page = parsePageParams(params.page, params.pageSize);
  const where = buildProductWhere(params);

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: buildOrderBy(params.sort),
      skip: page.skip,
      take: page.take,
      select: cardSelect,
      // One joined query instead of a round trip per nested relation.
      relationLoadStrategy: 'join',
    }),
    db.product.count({ where }),
  ]);

  return paginate(await withRatings(rows.map(toProductCard)), total, page);
}

/**
 * Facet values available within the current category, with counts.
 *
 * Deliberately not narrowed by the shopper's other active filters: a facet
 * list that collapses as you select from it is the classic way to trap someone
 * in a dead end with no visible way out.
 */
async function loadCatalogFacets(categoryPath?: string): Promise<CatalogFacets> {
  const where = buildProductWhere({ categoryPath });

  const [optionValues, priceAggregate] = await Promise.all([
    db.productOptionValue.findMany({
      where: {
        option: {
          product: where,
          name: { in: [OPTION_NAME_SIZE, OPTION_NAME_COLOR] },
        },
      },
      select: {
        value: true,
        hexColor: true,
        position: true,
        option: { select: { name: true } },
        _count: { select: { variantValues: true } },
      },
      orderBy: [{ position: 'asc' }, { value: 'asc' }],
    }),
    db.product.aggregate({
      where,
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  const sizes = new Map<string, number>();
  const colors = new Map<string, { hexColor: string | null; count: number }>();

  for (const row of optionValues) {
    const count = row._count.variantValues;
    if (row.option.name === OPTION_NAME_SIZE) {
      sizes.set(row.value, (sizes.get(row.value) ?? 0) + count);
    } else {
      const existing = colors.get(row.value);
      colors.set(row.value, {
        hexColor: existing?.hexColor ?? row.hexColor,
        count: (existing?.count ?? 0) + count,
      });
    }
  }

  return {
    sizes: [...sizes].map(([value, count]) => ({ value, count })),
    colors: [...colors].map(([value, data]) => ({
      value,
      hexColor: data.hexColor,
      count: data.count,
    })),
    priceRange: {
      min: priceAggregate._min.basePrice ?? 0,
      max: priceAggregate._max.basePrice ?? 0,
    },
  };
}

/**
 * Facets for the filter panel.
 *
 * Cached per category and tag-invalidated. The listing awaits this before it
 * can render its shell, so on a deployment where the database is a region away
 * these two queries were adding a full round trip to every listing view — and
 * the answer only changes when an admin edits the catalogue.
 */
export function getCatalogFacets(categoryPath?: string): Promise<CatalogFacets> {
  return unstable_cache(
    () => loadCatalogFacets(categoryPath),
    ['catalog-facets', categoryPath ?? 'all'],
    { tags: [PRODUCT_TAG, CATEGORY_TAG], revalidate: 600 },
  )();
}

const detailSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  brand: true,
  material: true,
  careInstructions: true,
  currency: true,
  basePrice: true,
  compareAtPrice: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
  category: { select: { id: true, name: true, slug: true, path: true } },
  images: {
    orderBy: { position: 'asc' },
    select: { id: true, url: true, alt: true, colorValue: true },
  },
  options: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      values: {
        orderBy: { position: 'asc' },
        select: { id: true, value: true, hexColor: true },
      },
    },
  },
  variants: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      sku: true,
      price: true,
      compareAtPrice: true,
      imageUrl: true,
      isActive: true,
      optionValues: { select: { optionValueId: true } },
      inventoryItem: { select: { quantity: true, reserved: true, allowBackorder: true } },
    },
  },
} satisfies Prisma.ProductSelect;

async function loadProductDetail(slug: string): Promise<ProductDetailData | null> {
  const row = await db.product.findFirst({
    where: { slug, ...publicProductWhere },
    select: detailSelect,
    // The detail select is deeper than the card one; without the join
    // strategy it fans out into a round trip per relation.
    relationLoadStrategy: 'join',
  });
  if (!row) return null;

  const [rating, breadcrumbTrail] = await Promise.all([
    db.productReview.aggregate({
      where: { productId: row.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    row.category ? getBreadcrumbsForPath(row.category.path) : Promise.resolve([]),
  ]);

  const variants = row.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    imageUrl: variant.imageUrl,
    optionValueIds: variant.optionValues.map((link) => link.optionValueId),
    available: variant.inventoryItem ? availableUnits(variant.inventoryItem) : 0,
    isActive: variant.isActive,
  }));

  const sellablePrices = variants
    .filter((variant) => variant.isActive)
    .map((variant) => variant.price);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    description: row.description,
    brand: row.brand,
    material: row.material,
    careInstructions: row.careInstructions,
    currency: row.currency,
    basePrice: row.basePrice,
    compareAtPrice: row.compareAtPrice,
    priceRange: {
      min: sellablePrices.length > 0 ? Math.min(...sellablePrices) : row.basePrice,
      max: sellablePrices.length > 0 ? Math.max(...sellablePrices) : row.basePrice,
    },
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    publishedAt: row.publishedAt,
    category: row.category,
    breadcrumbs: [{ name: 'Shop', href: '/shop' }, ...breadcrumbTrail],
    images: row.images,
    options: row.options,
    variants,
    isSoldOut: variants.every((variant) => !variant.isActive || variant.available <= 0),
    rating:
      rating._count._all > 0
        ? { average: Number(rating._avg.rating ?? 0), count: rating._count._all }
        : null,
  };
}

/**
 * Product detail is the hottest read in the catalogue and changes rarely, so
 * it is cached per slug and invalidated by tag when an admin saves.
 *
 * Stock is NOT trusted from this cache — the add-to-cart path re-checks
 * availability against the database before it commits anything.
 */
export function getProductBySlug(slug: string): Promise<ProductDetailData | null> {
  return unstable_cache(() => loadProductDetail(slug), ['product-detail', slug], {
    tags: [PRODUCT_TAG, productTag(slug)],
    revalidate: 300,
  })();
}

export const getFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<ProductCardData[]> => {
    const rows = await db.product.findMany({
      where: { ...publicProductWhere, isFeatured: true },
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
      select: cardSelect,
      relationLoadStrategy: 'join',
    });
    return withRatings(rows.map(toProductCard));
  },
  ['featured-products'],
  { tags: [PRODUCT_TAG, REVIEW_TAG], revalidate: 600 },
);

export const getNewArrivals = unstable_cache(
  async (limit = 8): Promise<ProductCardData[]> => {
    const rows = await db.product.findMany({
      where: publicProductWhere,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
      select: cardSelect,
      relationLoadStrategy: 'join',
    });
    return withRatings(rows.map(toProductCard));
  },
  ['new-arrivals'],
  { tags: [PRODUCT_TAG, REVIEW_TAG], revalidate: 600 },
);

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<ProductCardData[]> {
  if (!categoryId) return [];
  const rows = await db.product.findMany({
    where: { ...publicProductWhere, categoryId, id: { not: productId } },
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
    select: cardSelect,
    relationLoadStrategy: 'join',
  });
  return withRatings(rows.map(toProductCard));
}

/** Slugs for the sitemap. */
export async function getAllProductSlugs() {
  return db.product.findMany({
    where: publicProductWhere,
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 5000,
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listProductsForAdmin(params: {
  q?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  page?: number;
}) {
  await requirePermission('catalog:read');
  const page = parsePageParams(params.page, 25, 25);

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: 'insensitive' } },
            { variants: { some: { sku: { contains: params.q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        basePrice: true,
        currency: true,
        updatedAt: true,
        category: { select: { name: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
        variants: {
          select: {
            id: true,
            inventoryItem: { select: { quantity: true, reserved: true, allowBackorder: true } },
          },
        },
      },
    }),
    db.product.count({ where }),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    basePrice: row.basePrice,
    currency: row.currency,
    updatedAt: row.updatedAt,
    categoryName: row.category?.name ?? null,
    imageUrl: row.images[0]?.url ?? null,
    variantCount: row.variants.length,
    totalStock: row.variants.reduce(
      (sum, variant) => sum + (variant.inventoryItem?.quantity ?? 0),
      0,
    ),
  }));

  return paginate(items, total, page);
}

export async function getProductForAdmin(id: string) {
  await requirePermission('catalog:read');
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...detailSelect,
      status: true,
      isFeatured: true,
      categoryId: true,
      variants: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          weightGrams: true,
          isActive: true,
          optionValues: { select: { optionValue: { select: { value: true, optionId: true } } } },
          inventoryItem: { select: { quantity: true, reserved: true, lowStockThreshold: true } },
        },
      },
    },
  });
  if (!product) throw notFound('Product');
  return product;
}

/**
 * Create or replace a product with its options, values and variants.
 *
 * Options and variants are rebuilt wholesale inside one transaction. That is
 * simpler and safer than diffing, and variants that survive are matched by SKU
 * so their inventory and order history are preserved.
 */
export async function saveProduct(input: ProductInput, productId?: string) {
  const actor = await requirePermission('catalog:write');

  const slug = await uniqueSlug(input.slug || input.title, async (candidate) => {
    const existing = await db.product.findFirst({
      where: { slug: candidate, NOT: productId ? { id: productId } : undefined },
      select: { id: true },
    });
    return existing !== null;
  });

  if (input.categoryId) {
    const category = await db.category.findFirst({
      where: { id: input.categoryId, deletedAt: null },
      select: { id: true },
    });
    if (!category) throw notFound('Category');
  }

  const skuOwner = await db.productVariant.findFirst({
    where: {
      sku: { in: input.variants.map((variant) => variant.sku) },
      ...(productId ? { productId: { not: productId } } : {}),
    },
    select: { sku: true },
  });
  if (skuOwner) {
    throw conflict(`SKU ${skuOwner.sku} is already used by another product.`);
  }

  const result = await db.$transaction(async (tx) => {
    const base = {
      title: input.title,
      slug,
      shortDescription: input.shortDescription || null,
      description: input.description || null,
      status: input.status,
      categoryId: input.categoryId || null,
      brand: input.brand || null,
      material: input.material || null,
      careInstructions: input.careInstructions || null,
      basePrice: input.basePrice,
      compareAtPrice: input.compareAtPrice ?? null,
      isFeatured: input.isFeatured,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      publishedAt: input.status === 'ACTIVE' ? new Date() : null,
    };

    const product = productId
      ? await tx.product.update({
          where: { id: productId },
          // Keep the original publish date once a product has been live.
          data: {
            ...base,
            publishedAt:
              input.status === 'ACTIVE'
                ? ((await tx.product.findUnique({
                    where: { id: productId },
                    select: { publishedAt: true },
                  }))?.publishedAt ?? new Date())
                : null,
          },
        })
      : await tx.product.create({ data: base });

    // --- images ---------------------------------------------------------
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (input.images.length > 0) {
      await tx.productImage.createMany({
        data: input.images.map((image, index) => ({
          productId: product.id,
          url: image.url,
          alt: image.alt || null,
          colorValue: image.colorValue || null,
          position: index,
        })),
      });
    }

    // --- options and their values ---------------------------------------
    await tx.productOption.deleteMany({ where: { productId: product.id } });

    const valueIdByOptionAndValue = new Map<string, string>();
    for (const [optionIndex, option] of input.options.entries()) {
      const createdOption = await tx.productOption.create({
        data: { productId: product.id, name: option.name, position: optionIndex },
      });

      for (const [valueIndex, value] of option.values.entries()) {
        const createdValue = await tx.productOptionValue.create({
          data: {
            optionId: createdOption.id,
            value: value.value,
            hexColor: value.hexColor || null,
            position: valueIndex,
          },
        });
        valueIdByOptionAndValue.set(`${optionIndex}::${value.value}`, createdValue.id);
      }
    }

    // --- variants -------------------------------------------------------
    const keptSkus = input.variants.map((variant) => variant.sku);
    // Removing a variant that has order history would orphan those lines, so
    // deactivate rather than delete when it is referenced.
    const removable = await tx.productVariant.findMany({
      where: { productId: product.id, sku: { notIn: keptSkus } },
      select: { id: true, _count: { select: { orderItems: true } } },
    });

    const deletableIds = removable.filter((v) => v._count.orderItems === 0).map((v) => v.id);
    const retireableIds = removable.filter((v) => v._count.orderItems > 0).map((v) => v.id);

    if (deletableIds.length > 0) {
      await tx.productVariant.deleteMany({ where: { id: { in: deletableIds } } });
    }
    if (retireableIds.length > 0) {
      await tx.productVariant.updateMany({
        where: { id: { in: retireableIds } },
        data: { isActive: false },
      });
    }

    for (const [index, variant] of input.variants.entries()) {
      const optionValueIds = variant.optionValues
        .map((value, optionIndex) => valueIdByOptionAndValue.get(`${optionIndex}::${value}`))
        .filter((id): id is string => Boolean(id));

      const saved = await tx.productVariant.upsert({
        where: { sku: variant.sku },
        create: {
          productId: product.id,
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? null,
          weightGrams: variant.weightGrams ?? null,
          isActive: variant.isActive,
          position: index,
        },
        update: {
          productId: product.id,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? null,
          weightGrams: variant.weightGrams ?? null,
          isActive: variant.isActive,
          position: index,
        },
      });

      await tx.variantOptionValue.deleteMany({ where: { variantId: saved.id } });
      if (optionValueIds.length > 0) {
        await tx.variantOptionValue.createMany({
          data: optionValueIds.map((optionValueId) => ({ variantId: saved.id, optionValueId })),
        });
      }

      const existingInventory = await tx.inventoryItem.findUnique({
        where: { variantId: saved.id },
        select: { quantity: true },
      });

      if (!existingInventory) {
        await tx.inventoryItem.create({
          data: { variantId: saved.id, quantity: variant.quantity },
        });
        if (variant.quantity > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: saved.id,
              delta: variant.quantity,
              reason: 'RESTOCK',
              actorId: actor.id,
              note: 'Initial stock',
            },
          });
        }
      } else if (existingInventory.quantity !== variant.quantity) {
        // Quantity edited through the product form: record the delta so the
        // ledger stays the single source of truth for stock history.
        const delta = variant.quantity - existingInventory.quantity;
        await tx.inventoryItem.update({
          where: { variantId: saved.id },
          data: { quantity: variant.quantity },
        });
        await tx.stockMovement.create({
          data: {
            variantId: saved.id,
            delta,
            reason: 'ADJUSTMENT',
            actorId: actor.id,
            note: 'Edited on product form',
          },
        });
      }
    }

    return product;
  });

  await recordAudit({
    actorId: actor.id,
    action: productId ? 'product.update' : 'product.create',
    entityType: 'Product',
    entityId: result.id,
    after: { title: result.title, slug: result.slug, status: result.status },
  });

  revalidateTag(PRODUCT_TAG);
  revalidateTag(productTag(result.slug));
  revalidateTag(CATEGORY_TAG);

  return result;
}

export async function archiveProduct(id: string) {
  const actor = await requirePermission('catalog:write');

  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, title: true },
  });
  if (!product) throw notFound('Product');

  await db.product.update({
    where: { id },
    data: { status: 'ARCHIVED', publishedAt: null },
  });

  await recordAudit({
    actorId: actor.id,
    action: 'product.archive',
    entityType: 'Product',
    entityId: id,
    before: { title: product.title },
  });

  revalidateTag(PRODUCT_TAG);
  revalidateTag(productTag(product.slug));
}
