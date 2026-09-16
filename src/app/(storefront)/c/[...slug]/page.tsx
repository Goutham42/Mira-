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
  getChildCategories,
} from '@/server/services/category.service';
import { siteConfig } from '@/config/site';
import { listingMetadata } from '@/lib/listing-metadata';

type Params = { slug: string[] };

/** Rebuild the materialised path from the catch-all segments. */
function toPath(slug: string[]): string {
  return slug.map((segment) => decodeURIComponent(segment)).join('/');
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<StorefrontSearchParams>;
}): Promise<Metadata> {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const category = await getCategoryByPath(toPath(slug));
  if (!category) return { title: 'Not found' };

  return listingMetadata({
    basePath: `/c/${category.path}`,
    searchParams: resolvedSearchParams,
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description,
  });
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

  const [breadcrumbs, children] = await Promise.all([
    getBreadcrumbsForPath(category.path),
    getChildCategories(category.path),
  ]);

  /**
   * The same trail the visual breadcrumb renders, as structured data.
   *
   * Google uses this to show the category path in place of a bare URL in the
   * result listing. Emitted from the same `breadcrumbs` array the markup uses,
   * so the two cannot drift apart.
   */
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${siteConfig.url}/shop` },
      ...breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: crumb.name,
        item: `${siteConfig.url}${crumb.href}`,
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Values come from our own database, and JSON.stringify escapes the
        // quotes; the remaining risk is a literal "</script>" in a category
        // name, which the replace below neutralises.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

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

      {/*
        Without this, landing on a parent category gives a flat wall of
        everything beneath it and the only way to narrow down is the global
        nav. These are real links, so they are crawlable and give each child
        category an internal link from its parent.
      */}
      {children.length > 0 ? (
        <nav
          aria-label={`${category.name} subcategories`}
          className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"
        >
          <ul className="flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/c/${child.path}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-border-strong hover:bg-surface-muted"
                >
                  {child.name}
                  <span className="text-xs tabular-nums text-subtle-foreground">
                    {child.productCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

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
