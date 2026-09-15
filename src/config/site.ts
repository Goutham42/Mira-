import { clientEnv } from './env';

export const siteConfig = {
  name: clientEnv.NEXT_PUBLIC_STORE_NAME,
  tagline: "Women's ethnic wear",
  description:
    'Ethnic wear that blends tradition with modern living — kurtis, salwar sets and everyday essentials, made to be comfortable and beautifully you.',
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  currency: clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY,
  locale: 'en-IN',
  support: {
    email: 'support@mira.example',
    phone: '+91 80000 00000',
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

export const adminNav = [
  { title: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { title: 'Orders', href: '/admin/orders', icon: 'ShoppingBag' },
  { title: 'Products', href: '/admin/products', icon: 'Shirt' },
  { title: 'Categories', href: '/admin/categories', icon: 'FolderTree' },
  { title: 'Inventory', href: '/admin/inventory', icon: 'Boxes' },
  { title: 'Customers', href: '/admin/customers', icon: 'Users' },
] as const;
