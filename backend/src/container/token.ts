/**
 * Typed injection token. The phantom `_type` field carries the bound type so
 * `resolve` returns it without a cast — no magic strings anywhere (CLAUDE.md §7).
 */
export interface Token<TValue> {
  readonly key: symbol;
  readonly description: string;
  /** Never read at runtime; exists purely to make the token invariant in `TValue`. */
  readonly _type?: TValue;
}

export const createToken = <TValue>(description: string): Token<TValue> => ({
  key: Symbol(description),
  description,
});
