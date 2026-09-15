import { cn } from '@/lib/utils';

/**
 * Line-art garment icons for the category rail.
 *
 * Drawn inline rather than pulled from an icon set: lucide has no kurti,
 * inskirt or nightie, and a mixed set would break the single-stroke look the
 * rail depends on. All share one viewBox and stroke weight so they optically
 * match at the same size.
 */
type IconProps = { className?: string };

function Garment({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('size-8', className)}
    >
      {children}
    </svg>
  );
}

export function KurtiIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M15 5 9 8.5 5.5 15l4.5 2.2L12 13v29h16V13l2 4.2 4.5-2.2L31 8.5 25 5" />
      <path d="M15 5c1.6 3.6 3.3 5.4 5 5.4S23.4 8.6 25 5" />
      <path d="M20 16v22" />
    </Garment>
  );
}

export function SalwarSetIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M15 5 9 8.5 6 31l4.6 1L12.5 14v29h15V14l1.9 18 4.6-1L31 8.5 25 5" />
      <path d="M15 5c1.6 3.6 3.3 5.4 5 5.4S23.4 8.6 25 5" />
      <path d="M16 21h8" />
    </Garment>
  );
}

export function LeggingsIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M12 6h16l-1 37h-5.5L20 25l-1.5 18H13z" />
      <path d="M12.2 12h15.6" />
    </Garment>
  );
}

export function InnersIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M6 18 9.5 9M34 18 30.5 9" />
      <path d="M6 18c0 10.5 12.6 11.5 14 1.5 1.4 10 14 9 14-1.5" />
      <path d="M6 18h28" />
    </Garment>
  );
}

export function NightieIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M15 5 9.5 8.5 6 17l4.4 2L12.5 13 9.5 43h21l-3-30 2.1 6 4.4-2L30.5 8.5 25 5" />
      <path d="M15 5c1.6 3.6 3.3 5.4 5 5.4S23.4 8.6 25 5" />
      <path d="M13 24h14" />
    </Garment>
  );
}

export function InskirtIcon(props: IconProps) {
  return (
    <Garment {...props}>
      <path d="M12 6h16l3 37H9z" />
      <path d="M12.2 12h15.6" />
      <path d="M20 14v27" />
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
