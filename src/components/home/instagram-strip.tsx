import { InstagramIcon } from '@/components/brand/social-icons';
import { ImageSlot } from '@/components/ui/image-slot';
import { instagramSection } from '@/config/home';
import { siteConfig } from '@/config/site';

const handle = `@${siteConfig.name.toLowerCase().replace(/\s+/g, '')}`;

/**
 * The social strip.
 *
 * Eight equal tiles, one of which is the teal script card rather than a
 * photograph — `cardIndex` decides which, so reordering the feed later is a
 * config change, not a layout change.
 */
export function InstagramStrip() {
  const total = instagramSection.tiles.length + 1;
  const tiles = Array.from({ length: total }, (_, position) => {
    if (position === instagramSection.cardIndex) return { card: true as const };
    const tileIndex =
      position < instagramSection.cardIndex ? position : position - 1;
    return { card: false as const, ...instagramSection.tiles[tileIndex] };
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-3xl sm:text-[2rem]">Follow Us {handle}</h2>

        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{instagramSection.tagline}</p>
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${siteConfig.name} on Instagram`}
            className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          >
            <InstagramIcon className="size-4.5" />
          </a>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {tiles.map((tile, position) =>
          tile.card ? (
            <li
              key="script-card"
              className="flex aspect-square items-center justify-center rounded-sm bg-primary px-3 text-center"
            >
              <p className="font-script text-xl leading-tight text-primary-foreground">
                {instagramSection.cardLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </li>
          ) : (
            <li key={position}>
              <ImageSlot
                src={tile.image}
                alt={tile.alt}
                label="Feed"
                sizes="(min-width: 1024px) 12vw, (min-width: 640px) 25vw, 50vw"
                className="aspect-square w-full rounded-sm"
                tone={position % 3 === 1 ? 'mint' : 'warm'}
              />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
