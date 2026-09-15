import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

/**
 * Display-only star rating.
 *
 * Drawn as a single clipped overlay rather than five separate half/full icons,
 * so a 3.7 average renders as 3.7 stars instead of being rounded to something
 * the number beside it contradicts.
 */
export function StarRating({
  value,
  count,
  size = 'sm',
  showValue = false,
  className,
}: {
  value: number;
  /** Review count, rendered after the stars when given. */
  count?: number;
  size?: keyof typeof SIZES;
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const label =
    count === undefined
      ? `Rated ${clamped.toFixed(1)} out of 5`
      : `Rated ${clamped.toFixed(1)} out of 5 from ${count} review${count === 1 ? '' : 's'}`;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        role="img"
        aria-label={label}
        className="relative inline-flex shrink-0"
        style={{ lineHeight: 0 }}
      >
        <Stars className="text-border-strong" size={size} />
        <span
          aria-hidden
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          <Stars className="text-accent" size={size} filled />
        </span>
      </span>

      {showValue ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {clamped.toFixed(1)}
        </span>
      ) : null}

      {count !== undefined ? (
        <span className="text-xs tabular-nums text-muted-foreground">({count})</span>
      ) : null}
    </span>
  );
}

function Stars({
  className,
  size,
  filled = false,
}: {
  className?: string;
  size: keyof typeof SIZES;
  filled?: boolean;
}) {
  return (
    <span className={cn('flex gap-0.5', className)}>
      {[0, 1, 2, 3, 4].map((index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinejoin="round"
          aria-hidden
          className={cn(SIZES[size], 'shrink-0')}
        >
          <path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9.6l6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}
