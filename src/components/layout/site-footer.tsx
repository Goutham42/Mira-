import Link from 'next/link';

import { footerNav, siteConfig } from '@/config/site';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <p className="font-display text-2xl">{siteConfig.name}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>

          {footerNav.map((group) => (
            <nav key={group.title} aria-labelledby={`footer-${group.title}`}>
              <p id={`footer-${group.title}`} className="label-caps">
                {group.title}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>
            <a href={`mailto:${siteConfig.support.email}`} className="hover:text-foreground">
              {siteConfig.support.email}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
