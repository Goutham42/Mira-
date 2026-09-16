import { ImageResponse } from 'next/og';

/**
 * The browser tab icon.
 *
 * White mark on the brand teal rather than teal on cream: at 32px a thin
 * stroke on a light ground disappears against a light browser chrome, and the
 * solid tile is what the printed logo uses anyway.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f544c',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke="#fbf8f3" strokeWidth={3.2} strokeLinejoin="round">
          <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" />
          <rect x="9.5" y="9.5" width="29" height="29" rx="9.5" transform="rotate(45 24 24)" />
        </svg>
      </div>
    ),
    size,
  );
}
