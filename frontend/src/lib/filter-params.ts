/**
 * Filters live in the URL so a filtered list survives a reload and can be shared.
 * Both listing screens read and write them the same way, so the conversion is here
 * rather than duplicated per page (CLAUDE.md §9).
 */

export type FilterBag = Readonly<Record<string, string | number | undefined>>;

/**
 * Pulls the named keys out of the query string, plus `page`. The caller names the
 * filter shape it declared, which the query string cannot express on its own.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const readFilters = <TFilters extends FilterBag>(
  params: URLSearchParams,
  keys: readonly string[],
): TFilters => {
  const filters: Record<string, string | number | undefined> = {
    page: Number(params.get('page') ?? '1'),
  };

  for (const key of keys) {
    filters[key] = params.get(key) ?? undefined;
  }

  return filters as TFilters;
};

/** Drops blanks and a page of 1, so the URL only carries what the user actually chose. */
export const writeFilters = (filters: FilterBag): Record<string, string> => {
  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || String(value).trim() === '') {
      continue;
    }
    if (key === 'page' && Number(value) === 1) {
      continue;
    }
    next[key] = String(value);
  }

  return next;
};

/** How many filters are set, ignoring paging — drives the badge on the filter button. */
export const countActiveFilters = (filters: FilterBag): number =>
  Object.entries(filters).filter(
    ([key, value]) => key !== 'page' && value !== undefined && String(value).trim() !== '',
  ).length;
