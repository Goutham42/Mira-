import 'server-only';
import { db } from '@/server/db';
import { notFound } from '@/server/errors';
import { getCurrentUser, requireUser } from '@/server/auth/session';
import type { ProductCardData } from '@/types/catalog';
import { availableUnits } from './inventory.service';

async function getOrCreateWishlistId(userId: string): Promise<string> {
  const wishlist = await db.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  return wishlist.id;
}

export async function getWishlist(): Promise<ProductCardData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const wishlist = await db.wishlist.findUnique({
    where: { userId: user.id },
    select: {
      items: {
        orderBy: { createdAt: 'desc' },
        select: {
          product: {
            select: {
              id: true,
              slug: true,
              title: true,
              basePrice: true,
              compareAtPrice: true,
              currency: true,
              publishedAt: true,
              status: true,
              deletedAt: true,
              images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
              variants: {
                where: { isActive: true },
                select: {
                  inventoryItem: {
                    select: { quantity: true, reserved: true, allowBackorder: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!wishlist) return [];

  return wishlist.items
    .filter((item) => item.product.deletedAt === null && item.product.status === 'ACTIVE')
    .map(({ product }) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? product.title,
      hoverImageUrl: null,
      price: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      currency: product.currency,
      colors: [],
      isSoldOut: product.variants.every(
        (variant) => !variant.inventoryItem || availableUnits(variant.inventoryItem) <= 0,
      ),
      isNew: false,
      // The wishlist is a saved-items list, not a merchandising surface.
      rating: null,
    }));
}

/** Product ids in the wishlist, for rendering the toggle state on a grid. */
export async function getWishlistProductIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const items = await db.wishlistItem.findMany({
    where: { wishlist: { userId: user.id } },
    select: { productId: true },
  });
  return new Set(items.map((item) => item.productId));
}

/** Returns the resulting state so the client can render without a refetch. */
export async function toggleWishlistItem(productId: string): Promise<{ inWishlist: boolean }> {
  const user = await requireUser();

  const product = await db.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw notFound('Product');

  const wishlistId = await getOrCreateWishlistId(user.id);

  const existing = await db.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId, productId } },
    select: { id: true },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return { inWishlist: false };
  }

  await db.wishlistItem.create({ data: { wishlistId, productId } });
  return { inWishlist: true };
}

export async function removeFromWishlist(productId: string): Promise<void> {
  const user = await requireUser();
  await db.wishlistItem.deleteMany({
    where: { productId, wishlist: { userId: user.id } },
  });
}
