import { cn } from '@/lib/utils';

/**
 * The knot mark.
 *
 * Two interlaced rounded squares plus a centre diamond — drawn rather than
 * shipped as an asset so it inherits `currentColor` and stays crisp on the
 * cream header and the teal footer alike.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinejoin="round"
      aria-hidden
      className={cn('size-9', className)}
    >
      <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" />
      <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" transform="rotate(45 24 24)" />
      <rect x="17.5" y="17.5" width="13" height="13" rx="3.5" transform="rotate(45 24 24)" />
    </svg>
  );
}

/**
 * Mark + wordmark + tagline lockup, used in the header and the footer.
 * `tone` swaps the two-colour treatment for the dark teal footer.
 */
export function Logo({
  name,
  tagline,
  tone = 'light',
  className,
}: {
  name: string;
  tagline?: string;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark
        className={cn('size-10 shrink-0', tone === 'dark' ? 'text-white' : 'text-primary')}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.75rem] leading-none tracking-tight',
            tone === 'dark' ? 'text-white' : 'text-primary',
          )}
        >
          {name}
        </span>
        {tagline ? (
          <span
            className={cn(
              'mt-1 text-[0.6875rem] tracking-[0.02em]',
              tone === 'dark' ? 'text-white/70' : 'text-muted-foreground',
            )}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
