import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/commerce/pagination';
import { DiscountManager } from '@/components/admin/discount-manager';
import { listDiscountsForAdmin } from '@/server/services/discount.service';

export const metadata = { title: 'Discounts' };

/**
 * Discount codes.
 *
 * The cart could already redeem a code; there was simply no way to create one
 * without a database client. Admin-only by permission, not by convention —
 * `discount:write` is not granted to staff.
 */
export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;

  const discounts = await listDiscountsForAdmin({
    q: params.q,
    page: Number(params.page) || 1,
  });

  return (
    <div className="space-y-6">
      <DiscountManager discounts={discounts.items} />

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search codes"
          aria-label="Search discount codes"
          className="h-10 w-64 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-subtle-foreground"
        />
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Search
        </Button>
      </form>

      <Pagination
        page={discounts.page}
        totalPages={discounts.totalPages}
        searchParams={params}
        basePath="/admin/discounts"
      />
    </div>
  );
}
