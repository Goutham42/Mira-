import { clientEnv } from './env';

export const siteConfig = {
  name: clientEnv.NEXT_PUBLIC_STORE_NAME,
  tagline: 'Dresses made to be lived in',
  description:
    'Mira is a considered wardrobe of dresses and separates — cut well, made to last, and priced honestly.',
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  currency: clientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY,
  locale: 'en-IN',
  support: {
    email: 'support@mira.example',
    phone: '+91 80000 00000',
  },
  social: {
    instagram: 'https://instagram.com',
    pinterest: 'https://pinterest.com',
  },
} as const;

export const mainNav = [
  { title: 'New In', href: '/shop?sort=newest' },
  { title: 'Dresses', href: '/c/dresses' },
  { title: 'Tops', href: '/c/tops' },
  { title: 'Bottoms', href: '/c/bottoms' },
  { title: 'Shop All', href: '/shop' },
] as const;

export const footerNav = [
  {
    title: 'Shop',
    links: [
      { title: 'All Products', href: '/shop' },
      { title: 'Dresses', href: '/c/dresses' },
      { title: 'Tops', href: '/c/tops' },
      { title: 'Bottoms', href: '/c/bottoms' },
    ],
  },
  {
    title: 'Help',
    links: [
      { title: 'Contact', href: '/contact' },
      { title: 'Shipping & Returns', href: '/legal/shipping-returns' },
      { title: 'Size Guide', href: '/legal/size-guide' },
      { title: 'Track Order', href: '/account/orders' },
    ],
  },
  {
    title: 'About',
    links: [
      { title: 'Our Story', href: '/about' },
      { title: 'Privacy Policy', href: '/legal/privacy' },
      { title: 'Terms of Service', href: '/legal/terms' },
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
