/**
 * Twitter reads og:image when twitter:image is absent, so this exists only to
 * make the tag explicit rather than rely on that fallback. Same card as the
 * Open Graph one — re-exported rather than duplicated.
 */
export { alt, size, contentType, default } from './opengraph-image';
