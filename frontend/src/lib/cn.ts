export type ClassValue = string | false | null | undefined;

/** Joins conditional class names; falsy values are dropped. */
export const cn = (...values: ClassValue[]): string =>
  values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
