import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing behind these is indexable, and crawling them wastes budget on
      // per-session pages that differ for every visitor.
      disallow: ['/admin', '/account', '/checkout', '/cart', '/api/', '/search'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
