export interface NameParts {
  readonly firstName?: string | undefined;
  readonly middleName?: string | undefined;
  readonly lastName?: string | undefined;
}

/**
 * Joins the name parts that are actually present. Profile endpoints return the parts
 * separately and let the client compose them, but a display name is needed server-side
 * wherever one record summarises another — an applicant card, for instance.
 */
export const fullName = (parts: NameParts): string =>
  [parts.firstName, parts.middleName, parts.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');
