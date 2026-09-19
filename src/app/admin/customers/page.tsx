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
import { CustomerActions } from '@/components/admin/customer-actions';
import { listCustomersForAdmin } from '@/server/services/user.service';
import { getCurrentUser } from '@/server/auth/session';
import { hasPermission } from '@/server/auth/rbac';
import { formatMoney } from '@/lib/money';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Customers' };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;

  const [customers, viewer] = await Promise.all([
    listCustomersForAdmin({ q: params.q, page: Number(params.page) || 1 }),
    getCurrentUser(),
  ]);

  // Staff can read the list; only an admin can act on an account.
  const canManage = viewer ? hasPermission(viewer.role, 'user:manage') : false;

  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: 'medium' });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {customers.total} account{customers.total === 1 ? '' : 's'}
        </p>
      </header>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search name or email"
          aria-label="Search customers"
          className="h-10 w-64 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-subtle-foreground"
        />
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Search
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Lifetime spend</TableHead>
            <TableHead>Status</TableHead>
            {canManage ? <TableHead className="w-12 text-right">Manage</TableHead> : null}
          </TableRow>
        </TableHeader>

        <TableBody>
          {customers.items.length === 0 ? (
            <TableEmpty colSpan={canManage ? 6 : 5}>
              No customers match that search.
            </TableEmpty>
          ) : (
            customers.items.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <span className="block font-medium">{customer.name ?? '—'}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {customer.email}
                  </span>
                </TableCell>

                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateFormat.format(customer.createdAt)}
                </TableCell>

                <TableCell className="tabular-nums">{customer.orderCount}</TableCell>

                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatMoney(customer.lifetimeSpend, siteConfig.currency, siteConfig.locale)}
                </TableCell>

                <TableCell>
                  <span className="flex flex-wrap gap-1.5">
                    {customer.role !== 'CUSTOMER' ? (
                      <Badge variant="solid">{customer.role}</Badge>
                    ) : null}
                    {customer.status === 'SUSPENDED' ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : null}
                    {!customer.isVerified ? (
                      <Badge variant="warning">Unverified</Badge>
                    ) : null}
                    {customer.status === 'ACTIVE' &&
                    customer.isVerified &&
                    customer.role === 'CUSTOMER' ? (
                      <Badge variant="success">Active</Badge>
                    ) : null}
                  </span>
                </TableCell>

                {canManage ? (
                  <TableCell className="text-right">
                    <CustomerActions
                      userId={customer.id}
                      email={customer.email}
                      role={customer.role}
                      status={customer.status}
                      isSelf={customer.id === viewer?.id}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination
        page={customers.page}
        totalPages={customers.totalPages}
        searchParams={params}
        basePath="/admin/customers"
      />
    </div>
  );
}
