import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ProductListing,
  type StorefrontSearchParams,
} from '@/components/commerce/product-listing';
import {
  getBreadcrumbsForPath,
  getCategoryByPath,
} from '@/server/services/category.service';

type Params = { slug: string[] };

/** Rebuild the materialised path from the catch-all segments. */
function toPath(slug: string[]): string {
  return slug.map((segment) => decodeURIComponent(segment)).join('/');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryByPath(toPath(slug));
  if (!category) return { title: 'Not found' };

  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
    alternates: { canonical: `/c/${category.path}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<StorefrontSearchParams>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const path = toPath(slug);

  const category = await getCategoryByPath(path);
  if (!category) notFound();

  const breadcrumbs = await getBreadcrumbsForPath(category.path);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <li>
            <Link href="/shop" className="hover:text-foreground">
              Shop
            </Link>
          </li>
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.href} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground">{crumb.name}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <ProductListing
        categoryPath={category.path}
        searchParams={resolvedSearchParams}
        basePath={`/c/${category.path}`}
        heading={category.name}
        description={category.description}
      />
    </>
  );
}
