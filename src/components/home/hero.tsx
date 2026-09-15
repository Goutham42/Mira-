'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ImageSlot } from '@/components/ui/image-slot';
import { heroPillars, heroScript, heroSlides } from '@/config/home';
import { cn } from '@/lib/utils';

const ROTATE_MS = 7000;

/**
 * Hero carousel.
 *
 * The copy is real DOM on every slide (not a background image), so the
 * headline carries the LCP and is readable before any photography loads.
 * Rotation stops on hover, on keyboard focus inside the hero, and entirely
 * when the visitor prefers reduced motion.
 */
export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || reduced.current || heroSlides.length < 2) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % heroSlides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = heroSlides[index] ?? heroSlides[0];
  if (!slide) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative h-[34rem] sm:h-[36rem] lg:h-[40rem]">
        {heroSlides.map((item, i) => (
          <ImageSlot
            key={item.title.join(' ')}
            src={item.image}
            alt={item.alt}
            label={`Hero slide ${i + 1} — ${item.alt}`}
            ratio="21:9 · 2400×1030"
            sizes="100vw"
            priority={i === 0}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}

        {/* Wash from the left so the headline holds contrast over any photo. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(100deg,var(--background)_8%,rgb(251_248_243/0.72)_46%,transparent_78%)]"
        />

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div key={index} className="mira-rise max-w-xl">
            <p className="label-wide text-muted-foreground">{slide.eyebrow}</p>

            <h1 className="mt-5 font-display text-6xl leading-[0.95] text-primary sm:text-7xl lg:text-[5.5rem]">
              {slide.title[0]}
              <br />
              {slide.title[1]}
            </h1>

            <p className="mt-5 text-base text-muted-foreground sm:text-lg">
              {slide.subtitle}
            </p>

            <Link
              href={slide.cta.href}
              className="btn-pill mt-8 inline-flex items-center gap-3 rounded-full bg-primary py-3 pl-7 pr-3 text-sm text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {slide.cta.label}
              <span className="btn-arrow grid size-8 place-items-center rounded-full bg-white/15">
                <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden />
              </span>
            </Link>
          </div>

          {/* Right rail — the script line and the brand pillars. */}
          <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-10 text-right sm:right-6 lg:right-8 lg:flex">
            <p className="font-script -rotate-6 text-4xl leading-tight text-foreground/85 xl:text-5xl">
              {heroScript.split(' ').slice(0, 1).join(' ')}
              <br />
              <span className="pr-4">{heroScript.split(' ').slice(1).join(' ')}</span>
            </p>

            <ul className="space-y-2.5">
              {heroPillars.map((pillar) => (
                <li key={pillar} className="label-wide text-foreground/70">
                  {pillar}
                </li>
              ))}
            </ul>
          </div>

          {/* Slide indicators. */}
          <div className="absolute bottom-8 left-4 flex items-center gap-4 sm:left-6 lg:left-8">
            <span aria-hidden className="h-px w-14 bg-foreground/45" />
            {heroSlides.map((item, i) => (
              <button
                key={item.title.join(' ')}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show slide ${i + 1}: ${item.title.join(' ')}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'text-sm tabular-nums transition-all duration-300 ease-[var(--ease-soft)] hover:-translate-y-0.5',
                  i === index
                    ? 'text-foreground'
                    : 'text-foreground/40 hover:text-foreground/70',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
