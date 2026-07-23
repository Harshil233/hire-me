import { escapeRegex } from '../utils/regex';
import { toSearchTerms } from '../utils/search-terms';

/**
 * Turns a search box into one condition per word, each an `$or` across whatever fields
 * the caller decides that word may match.
 *
 * Every collection searches different fields, but the rule is the same everywhere: split
 * the query, escape each word, and require all of them to land somewhere. Keeping it here
 * means a repository cannot forget the escaping, and cannot quietly go back to matching
 * the whole phrase against one field at a time (CLAUDE.md §9).
 */
export const matchEverySearchWord = <TCondition>(
  search: string,
  alternativesFor: (term: RegExp, word: string) => TCondition[],
): { $or: TCondition[] }[] =>
  toSearchTerms(search).map((word) => ({
    $or: alternativesFor(new RegExp(escapeRegex(word), 'i'), word),
  }));
