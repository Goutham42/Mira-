'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Search box.
 *
 * A real form with a GET-style submit into the URL rather than a debounced
 * live query: it keeps results shareable and bookmarkable, and it does not
 * fire a database query on every keystroke.
 */
export function SearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        startTransition(() => {
          router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
        });
      }}
      className="flex max-w-xl gap-2"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search for a dress, colour or fabric"
          aria-label="Search products"
          className="pl-9"
          maxLength={120}
          autoComplete="off"
        />
      </div>
      <Button type="submit" loading={isPending}>
        Search
      </Button>
    </form>
  );
}
