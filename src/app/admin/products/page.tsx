import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/commerce/pagination';
import { listProductsForAdmin } from '@/server/services/product.service';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Products' };

const STATUS_VARIANT = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  ARCHIVED: 'warning',
} as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;

  const status =
    params.status === 'DRAFT' || params.status === 'ACTIVE' || params.status === 'ARCHIVED'
      ? params.status
      : undefined;

  const products = await listProductsForAdmin({
    q: params.q,
    status,
    page: Number(params.page) || 1,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.total} product{products.total === 1 ? '' : 's'}
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/products/new">
            <Plus />
            New product
          </Link>
        </Button>
      </header>

      {/* GET form: filters land in the URL, so the list stays shareable. */}
      <form method="get" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search title or SKU"
          aria-label="Search products"
          className="h-10 w-64 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-subtle-foreground"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          aria-label="Filter by status"
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Filter
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Variants</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.items.length === 0 ? (
            <TableEmpty colSpan={6}>
              No products found. Create your first one to get started.
            </TableEmpty>
          ) : (
            products.items.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="relative aspect-[3/4] w-10 shrink-0 overflow-hidden rounded bg-surface-muted">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          aria-hidden
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{product.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        /p/{product.slug}
                      </span>
                    </span>
                  </Link>
                </TableCell>

                <TableCell>
                  <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {product.categoryName ?? '—'}
                </TableCell>

                <TableCell className="tabular-nums">
                  {formatMoney(product.basePrice, product.currency, siteConfig.locale)}
                </TableCell>

                <TableCell className="tabular-nums">
                  <span className={product.totalStock === 0 ? 'text-destructive' : undefined}>
                    {product.totalStock}
                  </span>
                </TableCell>

                <TableCell className="tabular-nums text-muted-foreground">
                  {product.variantCount}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination
        page={products.page}
        totalPages={products.totalPages}
        searchParams={params}
        basePath="/admin/products"
      />
    </div>
  );
}
