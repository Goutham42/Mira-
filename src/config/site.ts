import { clientEnv } from './env';

export const siteConfig = {
  name: clientEnv.NEXT_PUBLIC_STORE_NAME,
  tagline: "Women's ethnic wear",
  /**
   * The meta description, and the fallback wherever a page has none. Kept
   * under 160 characters so search engines show it whole, and concrete about
   * what the shop sells rather than how it feels about itself.
   */
  description:
    'Everyday ethnic wear for women — kurtis, salwar sets, nighties, leggings and inners. Comfortable fabrics, honest prices, from our store in Coimbatore.',
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  currency: clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY,
  locale: 'en-IN',
  /**
   * PLACEHOLDER CONTACT DETAILS — replace before launch.
   *
   * These render on the contact page, in the footer and behind the WhatsApp
   * button, so shipping them as-is means customers cannot reach the shop.
   * `whatsapp` is digits only with the country code, as wa.me requires.
   */
  support: {
    email: 'support@mira.example',
    phone: '+91 80000 00000',
    whatsapp: '918000000000',
    hours: 'Mon – Sat, 10am – 7pm',
  },
  store: {
    label: 'Visit Our Store',
    locality: 'Vellalore, Coimbatore',
  },
  social: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
    pinterest: 'https://pinterest.com',
  },
} as const;

/**
 * Page headlines.
 *
 * Collected here so the storefront's voice can be read — and changed — in one
 * sitting, instead of being scattered across a dozen page components.
 */
export const headlines = {
  shop: {
    title: 'The whole collection',
    description:
      'Kurtis, salwar sets, nighties and the essentials that go under them — every piece we make, in one place.',
  },
  search: {
    empty: 'Search by garment, fabric or colour',
    noResults: 'Nothing matches that',
  },
  about: {
    kicker: 'Our story',
    title: 'Ethnic wear for the everyday',
  },
  contact: {
    kicker: 'Contact',
    title: 'We are happy to help',
    description: 'Real people read these. We reply within one working day.',
  },
} as const;

export const mainNav = [
  { title: 'Home', href: '/' },
  { title: 'Collections', href: '/shop' },
  { title: 'About', href: '/about' },
  { title: 'Contact', href: '/contact' },
] as const;

export const footerNav = [
  {
    title: 'Quick Links',
    links: [
      { title: 'Home', href: '/' },
      { title: 'Collections', href: '/shop' },
      { title: 'About Us', href: '/about' },
      { title: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Customer Care',
    links: [
      { title: 'FAQs', href: '/contact' },
      { title: 'Shipping & Returns', href: '/legal/shipping-returns' },
      { title: 'Size Guide', href: '/legal/size-guide' },
      { title: 'Track Your Order', href: '/account/orders' },
    ],
  },
] as const;

/**
 * Policy links for the footer's bottom bar.
 *
 * Kept out of `footerNav` so the Customer Care column stays the four links the
 * layout was designed around. These must remain reachable from every page:
 * payment providers check for them during onboarding, and the grievance
 * officer named in the privacy policy has to be findable.
 */
export const legalNav = [
  { title: 'Privacy', href: '/legal/privacy' },
  { title: 'Terms', href: '/legal/terms' },
  { title: 'Shipping & Returns', href: '/legal/shipping-returns' },
] as const;

export const adminNav = [
  { title: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { title: 'Orders', href: '/admin/orders', icon: 'ShoppingBag' },
  { title: 'Products', href: '/admin/products', icon: 'Shirt' },
  { title: 'Categories', href: '/admin/categories', icon: 'FolderTree' },
  { title: 'Inventory', href: '/admin/inventory', icon: 'Boxes' },
  { title: 'Customers', href: '/admin/customers', icon: 'Users' },
] as const;
