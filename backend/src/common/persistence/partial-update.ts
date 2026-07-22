export interface PartialUpdateQuery {
  readonly $set?: Record<string, unknown>;
  readonly $unset?: Record<string, ''>;
}

/**
 * PATCH semantics for profile documents: an omitted key is left untouched, an explicit
 * `null` clears the stored value. Shared by the candidate and HR profile repositories.
 */
export const buildPartialUpdate = (
  data: Readonly<Record<string, unknown>>,
  transformers: Readonly<Record<string, (value: unknown) => unknown>> = {},
): PartialUpdateQuery => {
  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      unset[key] = '';
      continue;
    }
    const transform = transformers[key];
    set[key] = transform === undefined ? value : transform(value);
  }

  return {
    ...(Object.keys(set).length > 0 ? { $set: set } : {}),
    ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
  };
};
