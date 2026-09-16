'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Grid density and view mode, remembered per visitor.
 *
 * These are a display convenience, not listing state, so they deliberately do
 * *not* live in the URL: a shared link should carry what the shopper filtered,
 * not how wide their columns were. localStorage is the right store for exactly
 * that reason — and every access is wrapped, because it throws in a private
 * window and returns nothing during thumbnail capture.
 */

export type Density = 2 | 3 | 4;
export type ViewMode = 'grid' | 'list';

type Preferences = {
  density: Density;
  view: ViewMode;
  setDensity: (density: Density) => void;
  setView: (view: ViewMode) => void;
  /** False until localStorage has been read, so the first paint is stable. */
  hydrated: boolean;
};

const STORAGE_KEY = 'mira:listing-preferences';
const DEFAULT_DENSITY: Density = 4;
const DEFAULT_VIEW: ViewMode = 'grid';

const PreferencesContext = createContext<Preferences | null>(null);

function readStored(): { density?: Density; view?: ViewMode } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { density?: unknown; view?: unknown };
    return {
      density: parsed.density === 2 || parsed.density === 3 || parsed.density === 4
        ? parsed.density
        : undefined,
      view: parsed.view === 'grid' || parsed.view === 'list' ? parsed.view : undefined,
    };
  } catch {
    return {};
  }
}

export function ListingPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);
  const [view, setViewState] = useState<ViewMode>(DEFAULT_VIEW);
  const [hydrated, setHydrated] = useState(false);

  // Read after mount rather than during render: the server has no localStorage,
  // so initialising from it directly would mismatch on hydration.
  useEffect(() => {
    const stored = readStored();
    if (stored.density) setDensityState(stored.density);
    if (stored.view) setViewState(stored.view);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: { density: Density; view: ViewMode }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A visitor who blocks storage still gets the change for this session.
    }
  }, []);

  const setDensity = useCallback(
    (next: Density) => {
      setDensityState(next);
      persist({ density: next, view });
    },
    [persist, view],
  );

  const setView = useCallback(
    (next: ViewMode) => {
      setViewState(next);
      persist({ density, view: next });
    },
    [density, persist],
  );

  const value = useMemo(
    () => ({ density, view, setDensity, setView, hydrated }),
    [density, hydrated, setDensity, setView, view],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useListingPreferences(): Preferences {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('useListingPreferences must be used inside ListingPreferencesProvider');
  }
  return context;
}

/** Tailwind column classes for a density. Written out so they survive purging. */
export const DENSITY_CLASS: Record<Density, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
};
