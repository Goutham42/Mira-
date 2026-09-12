import type { MetadataRoute } from 'next';

import { siteConfig } from '@/config/site';
import { getAllProductSlugs } from '@/server/services/product.service';
import { getCategoryTree } from '@/server/services/category.service';
import type { CategoryNode } from '@/types/catalog';

// Generated per request rather than at build time: the catalogue changes far
// more often than we deploy, and a build-time sitemap would need a database
// connection during CI.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const [products, categories] = await Promise.all([
      getAllProductSlugs(),
      getCategoryTree(),
    ]);

    return [
      ...staticRoutes,
      ...flatten(categories).map((category) => ({
        url: `${base}/c/${category.path}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...products.map((product) => ({
        url: `${base}/p/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // A sitemap that 500s is worse than a small one; serve what we can.
    return staticRoutes;
  }
}
