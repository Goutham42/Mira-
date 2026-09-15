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
  /** Photography URL. Leave `null` to render a labelled empty slot. */
  image: string | null;
  /** Alt text to use once a real image is in place. */
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
    image: null,
    alt: 'Model wearing a printed kurti with a teal dupatta',
  },
  {
    eyebrow: 'Made for',
    title: ['Effortless', 'Comfort'],
    subtitle: 'Breathable cotton that softens with every wash',
    cta: { label: 'Shop Kurtis', href: '/shop' },
    image: null,
    alt: 'Model in a pastel salwar set',
  },
  {
    eyebrow: 'Dressed for',
    title: ['Every', 'Occasion'],
    subtitle: 'From the school run to the family function',
    cta: { label: 'Explore Collections', href: '/shop' },
    image: null,
    alt: 'Model in a festive embroidered kurta set',
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
    image: null,
    alt: 'Model in a pink embroidered kurti',
  },
  {
    name: 'Salwar Sets',
    caption: 'Set and ready, no thinking required',
    image: null,
    alt: 'Model in a teal salwar set',
  },
  {
    name: 'Nighties',
    caption: 'The softest thing you own',
    image: null,
    alt: 'Model in a maroon printed nightie',
  },
];

export const collectionPromo = {
  headline: ['Chosen for how', 'they feel on', 'the fiftieth wear'],
  cta: { label: 'Explore Now', href: '/shop' },
  image: null as string | null,
  alt: 'Stack of folded printed fabrics',
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
  image: null as string | null,
  alt: 'Woman in an ethnic set holding a bunch of flowers',
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
  tiles: [
    { image: null, alt: 'Folded stack of printed fabrics' },
    { image: null, alt: 'Customer in a green kurta set' },
    { image: null, alt: 'Plant beside a fabric roll' },
    { image: null, alt: 'Customer in a pink kurti' },
    { image: null, alt: 'Close-up of a floral print' },
    { image: null, alt: 'Customer in a cream kurta' },
    { image: null, alt: 'Customer in a maroon kurti' },
  ] as Slot[],
};
