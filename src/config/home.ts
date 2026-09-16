import type { GarmentIconKey } from '@/components/brand/garment-icons';
import { siteConfig } from '@/config/site';

/**
 * Homepage editorial content.
 *
 * The homepage is a brand page, not a catalogue page — its copy and image
 * areas are fixed marketing content rather than anything an admin edits today.
 * Keeping it here means the section components stay layout-only, and swapping
 * copy or dropping in real photography is a single-file change: give any
 * `image` an URL (remote hosts must be allowed in next.config.ts) and the
 * placeholder panel is replaced by the photo.
 */

type Slot = {
  /**
   * Photography. A path under `public/` (e.g. `/images/boutique-rail.jpg`) or
   * a remote URL whose host is allowed in next.config.ts. `null` renders a
   * labelled empty slot instead.
   */
  image: string | null;
  /** Describes the photograph actually in the slot, for screen readers. */
  alt: string;
};

export type HeroSlide = {
  eyebrow: string;
  /** Split across two lines exactly as the headline is set. */
  title: [string, string];
  subtitle: string;
  cta: { label: string; href: string };
} & Slot;

export const heroSlides: HeroSlide[] = [
  {
    eyebrow: 'Ethnic wear for',
    title: ['Everyday', 'Elegance'],
    subtitle: 'Kurtis and salwar sets you can live in, all day',
    cta: { label: 'Shop New Arrivals', href: '/shop?sort=newest' },
    image: '/images/boutique-rail.jpg',
    alt: 'Shopper browsing a rail of clothes in a boutique',
  },
  {
    eyebrow: 'Made for',
    title: ['Effortless', 'Comfort'],
    subtitle: 'Breathable cotton that softens with every wash',
    cta: { label: 'Shop Kurtis', href: '/shop' },
    image: '/images/floral-rail.jpg',
    alt: 'Rail of floral print dresses',
  },
  {
    eyebrow: 'Dressed for',
    title: ['Every', 'Occasion'],
    subtitle: 'From the school run to the family function',
    cta: { label: 'Explore Collections', href: '/shop' },
    image: '/images/evening-rail.jpg',
    alt: 'Occasion wear on a rail under warm lights',
  },
];

/** The words stacked down the right edge of the hero. */
export const heroPillars = ['Tradition', 'Comfort', 'Confidence', 'You'] as const;

export const heroScript = 'Style Your Story';

export type CategoryTile = {
  key: GarmentIconKey;
  name: string;
};

export const categoryRail: CategoryTile[] = [
  { key: 'kurtis', name: 'Kurtis' },
  { key: 'salwar-sets', name: 'Salwar Sets' },
  { key: 'leggings', name: 'Leggings' },
  { key: 'inners', name: 'Inners' },
  { key: 'nighties', name: 'Nighties' },
  { key: 'inskirt', name: 'Inskirt' },
];

export type FeaturedCollection = {
  name: string;
  caption: string;
} & Slot;

export const featuredCollections: FeaturedCollection[] = [
  {
    name: 'Kurtis',
    caption: 'Work, weekend, everything between',
    image: '/images/shopper-bags.jpg',
    alt: 'Shopper carrying bags beside a clothing rail',
  },
  {
    name: 'Salwar Sets',
    caption: 'Set and ready, no thinking required',
    image: '/images/evening-rail.jpg',
    alt: 'Occasion wear on a rail under warm lights',
  },
  {
    name: 'Nighties',
    caption: 'The softest thing you own',
    image: '/images/floral-rail.jpg',
    alt: 'Rail of floral print dresses',
  },
];

export const collectionPromo = {
  headline: ['Chosen for how', 'they feel on', 'the fiftieth wear'],
  cta: { label: 'Explore Now', href: '/shop' },
  image: '/images/boutique-rail.jpg' as string | null,
  alt: 'Shopper browsing a rail of clothes in a boutique',
};

export type Reason = {
  icon: 'leaf' | 'heart' | 'gem' | 'users';
  title: string;
  description: string;
};

export const reasons: Reason[] = [
  { icon: 'leaf', title: 'Fabric that lasts', description: 'Softens with washing, never thins' },
  { icon: 'heart', title: 'Made for all day', description: 'Comfortable at 9am and at 9pm' },
  { icon: 'gem', title: 'Quietly current', description: 'Traditional cuts, nothing dated' },
  {
    icon: 'users',
    title: 'Bought again and again',
    description: `A growing ${siteConfig.name} family`,
  },
];

export const reasonQuote = {
  lines: ['“More than outfits,', 'it’s a feeling.”'],
  attribution: 'Made for the woman you already are.',
};

export const aboutSection = {
  kicker: 'About',
  title: ['Made for', 'Ordinary Days'],
  /** Rendered after an "At <store name>," lead-in, hence the lowercase start. */
  body:
    'we make ethnic wear for the days you actually have — not the two a year that need an occasion. Kurtis, salwar sets and the essentials underneath, chosen for how they behave after a month of wearing, and priced so buying another is never a decision.',
  cta: { label: 'Our Story', href: '/about' },
  image: '/images/shopper-bags.jpg' as string | null,
  alt: 'Shopper carrying bags beside a clothing rail',
};

export type Assurance = {
  icon: 'truck' | 'shield' | 'tag' | 'pin';
  title: string;
  description: string;
};

export const assurances: Assurance[] = [
  { icon: 'truck', title: 'Delivered to your door', description: 'Across India, tracked end to end' },
  { icon: 'shield', title: 'Checked before it ships', description: 'Every piece, by hand' },
  { icon: 'tag', title: 'Sized honestly', description: 'Real measurements, no guesswork' },
  {
    icon: 'pin',
    title: siteConfig.store.label,
    description: siteConfig.store.locality,
  },
];

export const instagramSection = {
  tagline: 'Real women. Real wardrobes.',
  /** The teal card sits in place of a photo at this index. */
  cardIndex: 6,
  cardLines: ['Good', 'Outfits', 'Brighter', 'Days'],
  // Index 6 is covered by the teal card (see `cardIndex`), so its image never
  // renders; it is filled anyway so reordering the tiles cannot leave a hole.
  tiles: [
    { image: '/images/floral-rail.jpg', alt: 'Rail of floral print dresses' },
    { image: '/images/shopper-bags.jpg', alt: 'Shopper carrying bags beside a clothing rail' },
    { image: '/images/boutique-interior.jpg', alt: 'Inside a boutique, clothes on rails' },
    { image: '/images/boutique-rail.jpg', alt: 'Shopper browsing a rail of clothes in a boutique' },
    { image: '/images/evening-rail.jpg', alt: 'Occasion wear on a rail under warm lights' },
    { image: '/images/floral-rail.jpg', alt: 'Rail of floral print dresses' },
    { image: '/images/boutique-rail.jpg', alt: 'Shopper browsing a rail of clothes in a boutique' },
  ] as Slot[],
};
