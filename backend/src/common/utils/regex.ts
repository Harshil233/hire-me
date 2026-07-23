/** Regex metacharacters that would otherwise change the meaning of a compiled pattern. */
const METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * Neutralises regex metacharacters so a user-supplied filter value can never alter the
 * pattern it is compiled into. Every repository that turns a search term into a `RegExp`
 * goes through here.
 */
export const escapeRegex = (value: string): string => value.replace(METACHARACTERS, '\\$&');
