/** Combining diacritical marks left behind by NFKD normalisation. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * URL-safe slug: lowercase, accents stripped, non-alphanumerics collapsed to a dash.
 * Returns an empty string when nothing usable remains, so callers can fall back.
 */
export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
