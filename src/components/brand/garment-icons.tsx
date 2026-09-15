import { cn } from '@/lib/utils';

/**
 * Line-art garment icons for the category rail.
 *
 * Drawn inline rather than pulled from an icon set: lucide has no kurti,
 * inskirt or nightie, and a mixed set would break the single-stroke look the
 * rail depends on. All share one viewBox, one stroke weight and one optical
 * size, and each carries a little construction detail — a yoke seam, a side
 * slit, a hem — so they read as garments rather than silhouettes at 32px.
 */
type IconProps = { className?: string };

function Garment({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      aria-hidden
      className={cn('size-8', className)}
    >
      {children}
    </svg>
  );
}

/** Straight tunic, short sleeves, round neck, side slits at the hem. */
export function KurtiIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M14.5 6 8.5 9.2 6 19l4.6 1.6L12.2 15v27.5h15.6V15l1.6 5.6L34 19l-2.5-9.8L25.5 6" />
      <path d="M14.5 6c1.7 3.9 3.5 5.8 5.5 5.8S23.8 9.9 25.5 6" />
      <path d="M12.6 37.5h14.8" />
      <path d="M20 16.5v21" />
    </Garment>
  );
}

/** Long-sleeved kurta with a dupatta falling across one shoulder. */
export function SalwarSetIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M14.5 6 9 9.2 6.6 30.5l4.5 1L12.8 15v27.5h14.4V15l1.7 16.5 4.5-1L31 9.2 25.5 6" />
      <path d="M14.5 6c1.7 3.9 3.5 5.8 5.5 5.8S23.8 9.9 25.5 6" />
      <path d="M16.2 9.5 24 34.5" />
      <path d="M13.5 20.5h13" />
    </Garment>
  );
}

/** Tapered leggings — waistband, inner seam, ankle cuffs. */
export function LeggingsIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M12 6.5h16l-1.4 36h-5.2L20 24.5l-1.4 18h-5.2z" />
      <path d="M12.3 12.5h15.4" />
      <path d="M13.6 38.5h4.8M21.6 38.5h4.8" />
    </Garment>
  );
}

/** Camisole — shoulder straps, shaped cups, a band beneath. */
export function InnersIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M7.5 17.5 10.5 8M32.5 17.5 29.5 8" />
      <path d="M7.5 17.5c0 9.8 11.5 10.8 12.5 1.4 1 9.4 12.5 8.4 12.5-1.4" />
      <path d="M7.5 17.5c4.2-2.2 8.3-3.3 12.5-3.3s8.3 1.1 12.5 3.3" />
      <path d="M20 18.9v4" />
    </Garment>
  );
}

/** Loose nightie — short sleeves, yoke seam, flared hem. */
export function NightieIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M14.5 6 9 9.2 6.2 17.5l4.4 1.8 1.9-5L9.5 42.5h21L27.5 14.3l1.9 5 4.4-1.8L31 9.2 25.5 6" />
      <path d="M14.5 6c1.7 3.9 3.5 5.8 5.5 5.8S23.8 9.9 25.5 6" />
      <path d="M11.9 21.5h16.2" />
      <path d="M14.5 27.5 13.5 42M25.5 27.5l1 14.5" />
    </Garment>
  );
}

/** A-line inskirt — waistband, drawstring, gathered centre fall. */
export function InskirtIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M12 6.5h16l3.2 36H8.8z" />
      <path d="M12.2 12.5h15.6" />
      <path d="M17 9.5h6" />
      <path d="M16.8 13.5 15.4 42.5M23.2 13.5l1.4 29" />
    </Garment>
  );
}

export const garmentIcons = {
  kurtis: KurtiIcon,
  'salwar-sets': SalwarSetIcon,
  leggings: LeggingsIcon,
  inners: InnersIcon,
  nighties: NightieIcon,
  inskirt: InskirtIcon,
} as const;

export type GarmentIconKey = keyof typeof garmentIcons;
