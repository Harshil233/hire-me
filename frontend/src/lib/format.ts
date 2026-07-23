/** Presentation helpers. Pure, so they are unit-tested in isolation (CLAUDE.md §9). */

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

const parse = (value: string | undefined): Date | null => {
  if (value === undefined || value === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatMonthYear = (value: string | undefined): string => {
  const date = parse(value);
  return date === null ? '' : MONTH_YEAR.format(date);
};

/** `Jan 2021 — Present` / `Jan 2021 — Mar 2023`. */
export const formatDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  isCurrent = false,
): string => {
  const start = formatMonthYear(startDate);

  if (start === '') {
    return '';
  }

  if (isCurrent) {
    return `${start} — Present`;
  }

  const end = formatMonthYear(endDate);
  return end === '' ? start : `${start} — ${end}`;
};

/** An ISO timestamp rendered for a native `<input type="date">`. */
export const toDateInputValue = (value: string | undefined): string => {
  const date = parse(value);
  return date === null ? '' : (date.toISOString().split('T')[0] ?? '');
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * `just now` / `4h ago` / `3d ago`, falling back to a date beyond a week. Takes the
 * comparison instant so tests can pin it rather than depend on the wall clock.
 */
export const formatRelativeTime = (value: string, now: number = Date.now()): string => {
  const date = parse(value);

  if (date === null) {
    return '';
  }

  const elapsed = now - date.getTime();

  if (elapsed < MINUTE) {
    return 'just now';
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m ago`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h ago`;
  }
  if (elapsed < 7 * DAY) {
    return `${Math.floor(elapsed / DAY)}d ago`;
  }

  return formatMonthYear(value);
};

export const fullName = (parts: {
  firstName?: string | undefined;
  middleName?: string | undefined;
  lastName?: string | undefined;
}): string =>
  [parts.firstName, parts.middleName, parts.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ');

/** Up to two letters for the avatar fallback. */
export const initials = (parts: {
  firstName?: string | undefined;
  lastName?: string | undefined;
}): string =>
  [parts.firstName, parts.lastName]
    .map((part) => part?.trim().charAt(0).toUpperCase() ?? '')
    .filter((letter) => letter.length > 0)
    .join('')
    .slice(0, 2);
