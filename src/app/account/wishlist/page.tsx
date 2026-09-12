import Link from 'next/link';
import type { Metadata } from 'next';
import { Heart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/commerce/product-grid';
import { getWishlist } from '@/server/services/wishlist.service';

export const metadata: Metadata = {
  title: 'Wishlist',
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const products = await getWishlist();

  if (products.length === 0) {
    return (
      <div className="rounded-lg border bg-surface px-6 py-16 text-center">
        <Heart className="mx-auto size-8 text-subtle-foreground" aria-hidden />
        <p className="mt-4 font-display text-xl">Nothing saved yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the heart on any piece to keep it here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl">Saved pieces</h2>
      <ProductGrid
        products={products}
        wishlistProductIds={new Set(products.map((product) => product.id))}
        className="mt-6"
      />
    </div>
  );
}
