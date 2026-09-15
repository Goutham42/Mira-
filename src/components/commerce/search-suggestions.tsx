import Link from 'next/link';

import { SEARCH_SUGGESTIONS } from '@/lib/search-terms';

/**
 * One-tap garment searches.
 *
 * A shopper who does not know the catalogue's vocabulary has nothing to type
 * into an empty search box. These name the categories in the words customers
 * use, and each is a plain link so it works before hydration.
 */
export function SearchSuggestions({ heading = 'Popular searches' }: { heading?: string }) {
  return (
    <div>
      <p className="label-caps">{heading}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SEARCH_SUGGESTIONS.map((term) => (
          <li key={term}>
            <Link
              href={`/search?q=${encodeURIComponent(term)}`}
              className="inline-flex rounded-full border border-border-strong px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
