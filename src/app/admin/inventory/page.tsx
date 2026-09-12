import Link from 'next/link';

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
import { StockAdjuster } from '@/components/admin/stock-adjuster';
import { listInventory } from '@/server/services/inventory.service';

export const metadata = { title: 'Inventory' };

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const items = await listInventory({ search: q });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lowest stock first. Available is on-hand minus units held by in-flight checkouts.
        </p>
      </header>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search SKU or product"
          aria-label="Search inventory"
          className="h-10 w-64 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-subtle-foreground"
        />
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Search
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variant</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>On hand</TableHead>
            <TableHead>Held</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length === 0 ? (
            <TableEmpty colSpan={6}>
              No inventory records yet. They are created when you add product variants.
            </TableEmpty>
          ) : (
            items.map((item) => {
              const available = Math.max(0, item.quantity - item.reserved);
              const variantLabel = item.variant.optionValues
                .map((link) => link.optionValue.value)
                .join(' / ');
              const low = !item.allowBackorder && available <= item.lowStockThreshold;

              return (
                <TableRow key={item.variantId}>
                  <TableCell>
                    <Link
                      href={`/admin/products/${item.variant.product.id}`}
                      className="block"
                    >
                      <span className="block font-medium">{item.variant.product.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {variantLabel || '—'}
                      </span>
                    </Link>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.variant.sku}
                  </TableCell>

                  <TableCell className="tabular-nums">{item.quantity}</TableCell>

                  <TableCell className="tabular-nums text-muted-foreground">
                    {item.reserved}
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      {available}
                      {available === 0 ? (
                        <Badge variant="destructive">Out</Badge>
                      ) : low ? (
                        <Badge variant="warning">Low</Badge>
                      ) : null}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <StockAdjuster
                      variantId={item.variantId}
                      label={`${item.variant.product.title} — ${variantLabel || item.variant.sku}`}
                      currentQuantity={item.quantity}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
