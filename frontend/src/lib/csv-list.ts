/**
 * Multi-valued filters travel through the URL as one comma-separated parameter, so a
 * filter bag stays a bag of scalars. Parsing and toggling live here rather than in the
 * component that happens to need them first (CLAUDE.md §9).
 */

/** Splits a comma-separated parameter, dropping blanks left by trailing commas. */
export const parseCsvList = (value: string | undefined): readonly string[] =>
  value === undefined
    ? []
    : value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');

/** Joins back, collapsing an empty selection to `undefined` so it leaves the URL. */
export const toCsvList = (items: readonly string[]): string | undefined =>
  items.length === 0 ? undefined : items.join(',');

/** Adds the item when it is absent, removes it when present. Order is preserved. */
export const toggleCsvItem = (
  value: string | undefined,
  item: string,
): string | undefined => {
  const items = parseCsvList(value);
  const isSelected = items.some((candidate) => candidate.toLowerCase() === item.toLowerCase());

  return toCsvList(
    isSelected
      ? items.filter((candidate) => candidate.toLowerCase() !== item.toLowerCase())
      : [...items, item],
  );
};
