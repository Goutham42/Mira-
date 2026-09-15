import type { Metadata, Viewport } from 'next';
import { Poppins, Cormorant_Garamond, Sacramento } from 'next/font/google';
import { Toaster } from 'sonner';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import './globals.css';

// Geometric sans — the wordmark, navigation and body copy in the design all
// use circular, single-storey letterforms, which a grotesque like Inter cannot
// reproduce. Poppins is the closest widely available match.
const sans = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans-geometric',
  display: 'swap',
});

const displaySerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display-serif',
  display: 'swap',
});

// Used only for the handwritten accents — the hero's "Style Your Story", the
// pull quote, and the Instagram tile. Sacramento over a bouncier script like
// Dancing Script because the design's hand is thin and monoline.
const scriptHand = Sacramento({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script-hand',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#fbf8f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sans.variable, displaySerif.variable, scriptHand.variable)}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: 'font-sans text-sm',
            },
          }}
        />
      </body>
    </html>
  );
}
