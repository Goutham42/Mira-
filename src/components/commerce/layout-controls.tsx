'use client';

import { Columns2, Grid2x2, Grid3x3, Rows3 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useListingPreferences, type Density } from './listing-preferences';

/**
 * Density and view switcher.
 *
 * Hidden below `sm`: on a phone there is only ever room for one sensible
 * layout, and offering four-column there would be a worse grid, not a denser
 * one.
 */
export function LayoutControls() {
  const { density, view, setDensity, setView } = useListingPreferences();

  const densities: { value: Density; label: string; Icon: typeof Grid2x2 }[] = [
    { value: 2, label: 'Two columns', Icon: Columns2 },
    { value: 3, label: 'Three columns', Icon: Grid2x2 },
    { value: 4, label: 'Four columns', Icon: Grid3x3 },
  ];

  return (
    <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Layout">
      {densities.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            setDensity(value);
            // Changing density implies the shopper wants a grid.
            if (view !== 'grid') setView('grid');
          }}
          aria-label={label}
          aria-pressed={view === 'grid' && density === value}
          className={cn(
            'rounded-md p-2 transition-colors',
            view === 'grid' && density === value
              ? 'bg-surface-muted text-foreground'
              : 'text-subtle-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}

      <span aria-hidden className="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        onClick={() => setView('list')}
        aria-label="List view"
        aria-pressed={view === 'list'}
        className={cn(
          'rounded-md p-2 transition-colors',
          view === 'list'
            ? 'bg-surface-muted text-foreground'
            : 'text-subtle-foreground hover:text-foreground',
        )}
      >
        <Rows3 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
