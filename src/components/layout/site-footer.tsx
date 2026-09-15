import Link from 'next/link';
import {
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import { Logo } from '@/components/brand/logo';
import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
} from '@/components/brand/social-icons';
import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { footerNav, siteConfig } from '@/config/site';

const assurances = [
  { label: 'Free shipping', detail: 'On prepaid orders above the threshold', Icon: Truck },
  { label: 'Easy returns', detail: '30 days on unworn pieces', Icon: RotateCcw },
  { label: 'Secure checkout', detail: 'UPI, cards, net banking and COD', Icon: ShieldCheck },
  { label: 'Real people', detail: 'Reach us on WhatsApp any working day', Icon: MessageCircle },
];

const socials = [
  { label: 'Instagram', href: siteConfig.social.instagram, Icon: InstagramIcon },
  { label: 'Facebook', href: siteConfig.social.facebook, Icon: FacebookIcon },
  { label: 'YouTube', href: siteConfig.social.youtube, Icon: YoutubeIcon },
];

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Reassurance strip. Shoppers decide whether to trust a small store long
          before checkout, so the promises sit on every page, not just there. */}
      <div className="border-b border-primary-foreground/15">
        <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {assurances.map(({ label, detail, Icon }) => (
            <li key={label} className="flex items-start gap-3">
              <Icon
                className="mt-0.5 size-5 shrink-0 text-primary-foreground/80"
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-0.5 text-xs text-primary-foreground/65">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1.1fr_1.5fr]">
          <div>
            <Logo name={siteConfig.name} tagline={siteConfig.tagline} tone="dark" />

            <p className="mt-6 text-sm font-medium">Get first access</p>
            <p className="mt-1 text-sm text-primary-foreground/65">
              New arrivals and offers, no more than twice a month.
            </p>
            <NewsletterForm tone="dark" source="footer" className="mt-4 max-w-xs" />
          </div>

          {footerNav.map((group) => (
            <nav key={group.title} aria-labelledby={`footer-${group.title}`}>
              <p
                id={`footer-${group.title}`}
                className="text-sm font-medium text-primary-foreground"
              >
                {group.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
            <div>
              <p className="text-sm font-medium">Follow Us</p>
              <ul className="mt-4 flex items-center gap-3">
                {socials.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={label}
                      className="grid size-9 place-items-center rounded-full border border-primary-foreground/25 text-primary-foreground/85 transition-colors hover:border-primary-foreground hover:text-primary-foreground"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div
              aria-hidden
              className="hidden w-px self-stretch bg-primary-foreground/20 sm:block"
            />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-primary-foreground/80"
                  strokeWidth={1.6}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium">{siteConfig.store.label}</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    {siteConfig.store.locality}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone
                  className="mt-0.5 size-5 shrink-0 text-primary-foreground/80"
                  strokeWidth={1.6}
                  aria-hidden
                />
                <div>
                  <a
                    href={`tel:${siteConfig.support.phone.replace(/\s/g, '')}`}
                    className="text-sm transition-colors hover:text-primary-foreground"
                  >
                    {siteConfig.support.phone}
                  </a>
                  <p className="mt-0.5 text-xs text-primary-foreground/60">
                    {siteConfig.support.hours}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 size-5 shrink-0 text-primary-foreground/80"
                  strokeWidth={1.6}
                  aria-hidden
                />
                <a
                  href={`mailto:${siteConfig.support.email}`}
                  className="text-sm transition-colors hover:text-primary-foreground"
                >
                  {siteConfig.support.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Made with
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden
              className="size-3.5"
            >
              <path d="M12 20.5 4.2 12.9a4.6 4.6 0 1 1 6.5-6.5l1.3 1.3 1.3-1.3a4.6 4.6 0 1 1 6.5 6.5Z" />
            </svg>
            in Coimbatore
          </p>
        </div>
      </div>
    </footer>
  );
}
