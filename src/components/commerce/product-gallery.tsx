'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import type { ProductImageData } from '@/types/catalog';

/**
 * Product image gallery.
 *
 * When the shopper picks a colour, the gallery narrows to images tagged with
 * that colour — but only if any exist, so an incompletely tagged product still
 * shows its full set rather than going blank.
 */
export function ProductGallery({
  images,
  title,
  activeColor,
}: {
  images: ProductImageData[];
  title: string;
  activeColor: string | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const visible = useMemo(() => {
    if (!activeColor) return images;
    const filtered = images.filter((image) => image.colorValue === activeColor);
    return filtered.length > 0 ? filtered : images;
  }, [images, activeColor]);

  // The colour change may leave the index past the end of the new set.
  const index = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  const active = visible[index];

  if (visible.length === 0 || !active) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md bg-surface-muted text-sm text-subtle-foreground">
        No images yet
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      {visible.length > 1 ? (
        <ul
          className="flex gap-3 overflow-x-auto md:w-20 md:flex-col md:overflow-visible"
          aria-label="Product images"
        >
          {visible.map((image, thumbIndex) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedIndex(thumbIndex)}
                aria-current={thumbIndex === index}
                className={cn(
                  'relative aspect-[3/4] w-16 overflow-hidden rounded transition-opacity md:w-full',
                  thumbIndex === index
                    ? 'ring-1 ring-foreground'
                    : 'opacity-70 hover:opacity-100',
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  aria-hidden
                  fill
                  sizes="80px"
                  className="object-cover"
                />
                <span className="sr-only">{`View image ${thumbIndex + 1}`}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-md bg-surface-muted">
        <Image
          key={active.id}
          src={active.url}
          alt={active.alt ?? title}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
