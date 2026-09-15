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
    subtitle: 'Timeless styles for the modern you',
    cta: { label: 'Shop New Arrivals', href: '/shop?sort=newest' },
    image: null,
    alt: 'Model wearing a printed kurti with a teal dupatta',
  },
  {
    eyebrow: 'Handpicked for',
    title: ['Effortless', 'Comfort'],
    subtitle: 'Soft fabrics that move the way you do',
    cta: { label: 'Shop Kurtis', href: '/shop' },
    image: null,
    alt: 'Model in a pastel salwar set',
  },
  {
    eyebrow: 'Made for',
    title: ['Every', 'Occasion'],
    subtitle: 'From morning errands to evening celebrations',
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
  href: string;
};

export const categoryRail: CategoryTile[] = [
  { key: 'kurtis', name: 'Kurtis', href: '/c/kurtis' },
  { key: 'salwar-sets', name: 'Salwar Sets', href: '/c/salwar-sets' },
  { key: 'leggings', name: 'Leggings', href: '/c/leggings' },
  { key: 'inners', name: 'Inners', href: '/c/inners' },
  { key: 'nighties', name: 'Nighties', href: '/c/nighties' },
  { key: 'inskirt', name: 'Inskirt', href: '/c/inskirt' },
];

export type FeaturedCollection = {
  name: string;
  caption: string;
  href: string;
} & Slot;

export const featuredCollections: FeaturedCollection[] = [
  {
    name: 'Kurtis',
    caption: 'Everyday Chic',
    href: '/c/kurtis',
    image: null,
    alt: 'Model in a pink embroidered kurti',
  },
  {
    name: 'Salwar Sets',
    caption: 'Grace in Every Step',
    href: '/c/salwar-sets',
    image: null,
    alt: 'Model in a teal salwar set',
  },
  {
    name: 'Nighties',
    caption: 'Comfort All Day',
    href: '/c/nighties',
    image: null,
    alt: 'Model in a maroon printed nightie',
  },
];

export const collectionPromo = {
  headline: ['Thoughtfully', 'curated for your', 'everyday moments'],
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
  { icon: 'leaf', title: 'Quality Fabrics', description: 'Feels good, lasts long' },
  { icon: 'heart', title: 'Everyday Comfort', description: 'Wear it. Live in it.' },
  { icon: 'gem', title: 'Trendy & Timeless', description: 'Classic with a modern touch' },
  {
    icon: 'users',
    title: 'Loved by many',
    description: `A growing ${siteConfig.name} family`,
  },
];

export const reasonQuote = {
  lines: ['“More than outfits,', 'it’s a feeling.”'],
  attribution: 'For the woman in every you.',
};

export const aboutSection = {
  kicker: 'About',
  title: ['Celebrating', 'You, Every Day'],
  /** Rendered after an "At <store name>," lead-in, hence the lowercase start. */
  body:
    'we bring you ethnic wear that blends tradition with modern living. From everyday essentials to special occasions, our collections are designed to make you feel confident, comfortable and beautifully you.',
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
  { icon: 'truck', title: 'Easy Shopping', description: 'Hassle-free experience' },
  { icon: 'shield', title: 'Trusted Quality', description: 'Only the best for you' },
  { icon: 'tag', title: 'Styles for Every Woman', description: 'From everyday to special days' },
  {
    icon: 'pin',
    title: siteConfig.store.label,
    description: siteConfig.store.locality,
  },
];

export const instagramSection = {
  tagline: 'Real Women. Real Style.',
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
