import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Package, Phone, Ruler } from 'lucide-react';

import { WhatsAppLink } from '@/components/marketing/whatsapp-link';

import { headlines, siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get in touch with ${siteConfig.name} about an order, a return, or sizing.`,
  alternates: { canonical: '/contact' },
};

/**
 * Contact details rather than a contact form.
 *
 * A form here would need transactional email to actually deliver anything, and
 * that is not wired up yet — a form that silently drops messages is worse than
 * no form. These routes work today. Replace this with a form once email
 * delivery is configured.
 */
export default function ContactPage() {
  return (
    <article>
      <p className="label-wide text-muted-foreground">{headlines.contact.kicker}</p>
      <h1 className="mt-3 text-4xl">{headlines.contact.title}</h1>
      <p className="mt-4 text-muted-foreground">
        {headlines.contact.description}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <WhatsAppLink />

        <a
          href={`mailto:${siteConfig.support.email}`}
          className="rounded-lg border bg-surface p-5 transition-colors hover:border-border-strong"
        >
          <Mail className="size-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-display text-lg">Email us</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{siteConfig.support.email}</p>
        </a>

        <a
          href={`tel:${siteConfig.support.phone.replace(/\s/g, '')}`}
          className="rounded-lg border bg-surface p-5 transition-colors hover:border-border-strong"
        >
          <Phone className="size-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-display text-lg">Call us</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{siteConfig.support.phone}</p>
          <p className="mt-1 text-xs text-subtle-foreground">{siteConfig.support.hours}</p>
        </a>
      </div>

      <section className="mt-12 border-t pt-10">
        <h2 className="text-2xl">Before you write</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These answer most of what we get asked.
        </p>

        <ul className="mt-6 space-y-3">
          <li>
            <Link
              href="/account/orders"
              className="flex items-start gap-3 rounded-lg border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <Package className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-sm">Where is my order?</span>
                <span className="block text-xs text-muted-foreground">
                  Tracking is on your order page as soon as the parcel is dispatched.
                </span>
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/legal/shipping-returns"
              className="flex items-start gap-3 rounded-lg border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <Package className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-sm">I want to return something</span>
                <span className="block text-xs text-muted-foreground">
                  30 days, unworn with tags. We arrange the pickup.
                </span>
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/legal/size-guide"
              className="flex items-start gap-3 rounded-lg border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <Ruler className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-sm">Which size should I take?</span>
                <span className="block text-xs text-muted-foreground">
                  Real body measurements, plus how each fabric behaves.
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </article>
  );
}
