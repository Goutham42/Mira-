import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

/**
 * The storefront renders per request.
 *
 * The header shows this shopper's cart count and session, so no storefront
 * page can be a static prerender. Catalogue caching is not lost — it lives one
 * level down, in the tag-invalidated `unstable_cache` wrappers around the
 * product and category queries, which is where it belongs.
 */
export const dynamic = 'force-dynamic';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
