import { Gem, Heart, Leaf, Users } from 'lucide-react';

import { reasonQuote, reasons } from '@/config/home';
import { siteConfig } from '@/config/site';

const icons = { leaf: Leaf, heart: Heart, gem: Gem, users: Users } as const;

/** Decorative sprig that sits behind the pull quote, as in the design. */
function Sprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M8 112C40 100 96 72 150 10" />
      {[
        [34, 96],
        [56, 84],
        [78, 68],
        [98, 52],
        [116, 36],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y}c10-16 26-20 34-16-4 14-20 22-34 16Z`} />
          <path d={`M${x} ${y}c-14-10-14-26-8-32 12 8 16 24 8 32Z`} />
        </g>
      ))}
    </svg>
  );
}

export function WhyChoose() {
  return (
    <section className="reveal mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="font-display text-4xl sm:text-[2.75rem]">
        Why Choose {siteConfig.name}?
      </h2>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem] lg:items-center lg:gap-16">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {reasons.map((reason) => {
            const Icon = icons[reason.icon];
            return (
              <li
                key={reason.title}
                className="group flex flex-col items-center rounded-lg px-3 py-4 text-center transition-colors duration-300 hover:bg-surface-muted/60"
              >
                <Icon
                  className="size-7 text-foreground transition-all duration-300 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:text-primary"
                  strokeWidth={1.3}
                  aria-hidden
                />
                <p className="mt-4 text-sm font-medium text-foreground">{reason.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{reason.description}</p>
              </li>
            );
          })}
        </ul>

        <figure className="relative">
          <Sprig className="pointer-events-none absolute -right-6 -top-16 hidden w-44 text-primary/25 lg:block" />
          <blockquote className="relative font-script text-3xl leading-tight text-primary xl:text-4xl">
            {reasonQuote.lines.map((line, i) => (
              <span key={line} className={i === 1 ? 'block pl-6' : 'block'}>
                {line}
              </span>
            ))}
          </blockquote>
          <figcaption className="relative mt-4 text-sm text-muted-foreground">
            {siteConfig.name} – {reasonQuote.attribution}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
