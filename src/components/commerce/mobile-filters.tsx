'use client';

import { useState } from 'react';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { CatalogFacets } from '@/types/catalog';
import { FilterPanel } from './filter-panel';

/** Wraps the same FilterPanel in a slide-over for narrow screens. */
export function MobileFilters({
  facets,
  children,
}: {
  facets: CatalogFacets;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <button type="button" aria-label="Open filters">
          {children}
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" title="Filters" description="Narrow the product list">
        <div className="overflow-y-auto px-5 py-6">
          <FilterPanel facets={facets} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
