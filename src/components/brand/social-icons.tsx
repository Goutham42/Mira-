import { cn } from '@/lib/utils';

/**
 * Social glyphs.
 *
 * lucide-react v1 dropped its brand icons, so the three marks the footer and
 * the social strip need are drawn here in the same stroke language as the rest
 * of the icon set.
 */
type IconProps = { className?: string };

function Glyph({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('size-4', className)}
    >
      {children}
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M14.5 8.5h2.2V5.4h-2.4c-2.3 0-3.6 1.4-3.6 3.7v1.8H8.4v3.1h2.3V21h3.2v-7h2.4l.4-3.1h-2.8V9.4c0-.6.2-.9.6-.9Z" />
    </Glyph>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4.5" />
      <path d="m10.2 9.4 5 2.6-5 2.6z" />
    </Glyph>
  );
}
