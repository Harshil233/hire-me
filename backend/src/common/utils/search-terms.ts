import { SEARCH } from '../../config/constants';

/**
 * Splits a search box into the words it is really asking about.
 *
 * A query is matched word by word rather than as one string, because the words often
 * belong to different fields: "neel ch" is a first name and part of a surname, "backend
 * pune" is a title and a location. Matching the whole phrase against each field in turn
 * finds neither.
 *
 * Capped, so a pathological query cannot turn into an unbounded pile of conditions.
 */
export const toSearchTerms = (value: string): string[] =>
  value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .slice(0, SEARCH.MAX_TERMS);
