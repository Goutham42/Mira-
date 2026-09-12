'use client';

import { cn } from '@/lib/utils';
import type { ProductOptionData } from '@/types/catalog';

/**
 * One option row (Size, Color, …).
 *
 * Values that cannot combine with the current selection are disabled rather
 * than hidden — a shopper needs to see that a size exists but is unavailable in
 * the colour they picked, otherwise the row silently changes shape.
 */
export function VariantSelector({
  option,
  selectedValueId,
  unavailableValueIds,
  onSelect,
}: {
  option: ProductOptionData;
  selectedValueId: string | null;
  unavailableValueIds: Set<string>;
  onSelect: (valueId: string) => void;
}) {
  const isColor = option.name.toLowerCase() === 'color';
  const selectedValue = option.values.find((value) => value.id === selectedValueId);

  return (
    <fieldset className="space-y-2.5">
      <legend className="flex w-full items-baseline justify-between gap-4">
        <span className="label-caps">{option.name}</span>
        {selectedValue ? (
          <span className="text-sm text-muted-foreground">{selectedValue.value}</span>
        ) : null}
      </legend>

      <div className="flex flex-wrap gap-2">
        {option.values.map((value) => {
          const selected = value.id === selectedValueId;
          const unavailable = unavailableValueIds.has(value.id);

          if (isColor && value.hexColor) {
            return (
              <button
                key={value.id}
                type="button"
                onClick={() => onSelect(value.id)}
                aria-pressed={selected}
                aria-label={`${value.value}${unavailable ? ' (unavailable)' : ''}`}
                title={value.value}
                className={cn(
                  'relative size-9 rounded-full border transition-transform',
                  selected
                    ? 'border-foreground ring-1 ring-foreground ring-offset-2 ring-offset-background'
                    : 'border-border-strong hover:scale-105',
                  unavailable && 'opacity-40',
                )}
                style={{ backgroundColor: value.hexColor }}
              >
                {unavailable ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 m-auto h-px w-full rotate-45 bg-foreground/60"
                  />
                ) : null}
              </button>
            );
          }

          return (
            <button
              key={value.id}
              type="button"
              onClick={() => onSelect(value.id)}
              aria-pressed={selected}
              className={cn(
                'min-w-12 rounded-md border px-3.5 py-2 text-sm transition-colors',
                selected
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border-strong hover:bg-surface-muted',
                unavailable && 'text-subtle-foreground line-through opacity-60',
              )}
            >
              {value.value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
