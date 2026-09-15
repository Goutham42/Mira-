import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * A photography placeholder.
 *
 * The homepage layout is photography-led, but the shop has no hero or
 * editorial imagery yet. Rather than ship a stock photo that has to be hunted
 * down and removed later, every image area renders through this: pass `src`
 * and it is a plain `next/image` fill; leave it off and it renders a warm
 * panel naming what belongs there and at what ratio.
 */
export function ImageSlot({
  src,
  alt = '',
  label,
  ratio,
  sizes,
  priority,
  className,
  imageClassName,
  tone = 'warm',
}: {
  src?: string | null;
  alt?: string;
  /** What this slot is for, e.g. "Hero — model in kurti". Shown when empty. */
  label: string;
  /** Aspect hint shown under the label, e.g. "16:9". */
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  tone?: 'warm' | 'mint';
}) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden bg-surface-muted', className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '100vw'}
          priority={priority}
          className={cn('object-cover', imageClassName)}
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${label} — image placeholder`}
      className={cn(
        'relative overflow-hidden',
        tone === 'mint'
          ? 'bg-gradient-to-br from-mint via-mint to-accent-soft'
          : 'bg-gradient-to-br from-surface-muted via-[#f0e8db] to-accent-soft',
        className,
      )}
    >
      {/* A faint stroke grid keeps an empty slot from reading as a broken
          image while staying quiet enough to photograph over later. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 14px)',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          aria-hidden
          className="size-6 text-subtle-foreground"
        >
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <circle cx="8.5" cy="10" r="1.6" />
          <path d="m3.5 17 5-5 4.5 4.5 3-2.5 4.5 4" />
        </svg>
        <p className="text-[0.6875rem] leading-tight tracking-[0.12em] text-subtle-foreground uppercase">
          {label}
        </p>
        {ratio ? <p className="text-[0.625rem] text-subtle-foreground/80">{ratio}</p> : null}
      </div>
    </div>
  );
}
