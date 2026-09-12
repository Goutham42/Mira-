import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProductCardData } from '@/types/catalog';
import { ProductCard } from './product-card';

export function ProductGrid({
  products,
  wishlistProductIds,
  className,
}: {
  products: ProductCardData[];
  wishlistProductIds?: Set<string>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 4}
          inWishlist={wishlistProductIds?.has(product.id) ?? false}
        />
      ))}
    </div>
  );
}

/** Matches ProductGrid's box exactly so swapping in real data shifts nothing. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
