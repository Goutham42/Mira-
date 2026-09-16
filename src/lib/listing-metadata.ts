import type { Metadata } from 'next';

import { siteConfig } from '@/config/site';

/**
 * Metadata helpers shared by /shop and /c/[...slug].
 *
 * Listing pages multiply: every combination of size, colour, price and sort is
 * a distinct URL serving near-identical content. Left alone that is a large
 * surface of thin duplicates competing with the pages we actually want ranked.
 *
 * The rule applied here is deliberately narrow:
 *
 * - Filters and sort are *dropped* from the canonical. `?size=M&sort=price-asc`
 *   is the same collection in a different order, so it should consolidate onto
 *   the clean URL.
 * - `page` is *kept*. Page 2 holds different products, so canonicalising it to
 *   page 1 tells Google those products are a duplicate of a page they do not
 *   appear on, and they drop out of the index.
 */

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The page number as it should appear in a canonical, or null for page 1. */
function canonicalPage(searchParams: SearchParams): number | null {
  const raw = firstValue(searchParams.page);
  if (raw === undefined) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 1) return null;
  return Math.trunc(parsed);
}

export function listingCanonical(basePath: string, searchParams: SearchParams): string {
  const page = canonicalPage(searchParams);
  return page ? `${basePath}?page=${page}` : basePath;
}

/**
 * Open Graph and Twitter tags for a listing.
 *
 * Without this the root layout's homepage card is inherited verbatim — Next
 * merges metadata per top-level key, so declaring `openGraph` anywhere below
 * the root replaces the whole object rather than merging into it. Sharing a
 * collection link would otherwise preview as the homepage.
 */
export function listingMetadata({
  basePath,
  searchParams,
  title,
  description,
}: {
  basePath: string;
  searchParams: SearchParams;
  title: string;
  description?: string | null;
}): Metadata {
  const canonical = listingCanonical(basePath, searchParams);
  const page = canonicalPage(searchParams);
  // Page 2 onwards is distinct content, so say so in the title rather than
  // shipping several pages that differ only by their product grid.
  const pagedTitle = page ? `${title} — page ${page}` : title;
  const resolvedDescription = description ?? siteConfig.description;

  return {
    title: pagedTitle,
    description: resolvedDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: siteConfig.name,
      url: canonical,
      title: pagedTitle,
      description: resolvedDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: pagedTitle,
      description: resolvedDescription,
    },
  };
}
