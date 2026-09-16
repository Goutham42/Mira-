import { ImageResponse } from 'next/og';

import { siteConfig } from '@/config/site';

/**
 * The social share card.
 *
 * Generated rather than shipped as a PNG so it always carries the current
 * store name and tagline. Rendered by Satori, which supports a subset of CSS:
 * flexbox only, explicit `display: flex` on anything with more than one child,
 * and no external stylesheets — hence the inline styles throughout.
 *
 * Next serves this at /opengraph-image and injects the og:image and
 * twitter:image tags automatically. `twitter:card` is declared as
 * summary_large_image in the root layout, which requires an image to exist —
 * without this file those cards render blank.
 */
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CREAM = '#fbf8f3';
const TEAL = '#0f544c';
const INK = '#2a2a26';
const MUTED = '#5f5f57';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: CREAM,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 48 48" fill="none" stroke={TEAL} strokeWidth={2.1} strokeLinejoin="round">
            <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" />
            <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" transform="rotate(45 24 24)" />
            <rect x="17.5" y="17.5" width="13" height="13" rx="3.5" transform="rotate(45 24 24)" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 52, color: TEAL, letterSpacing: '-0.01em' }}>
              {siteConfig.name}
            </div>
            <div style={{ fontSize: 22, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {siteConfig.tagline}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, color: INK, lineHeight: 1.12, maxWidth: 900 }}>
            Ethnic wear for
          </div>
          <div style={{ fontSize: 76, color: TEAL, lineHeight: 1.12 }}>everyday elegance</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, color: MUTED }}>
            Kurtis · Salwar sets · Nighties · Leggings
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 3, background: TEAL }} />
            <div style={{ fontSize: 24, color: TEAL }}>{siteConfig.store.locality}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
