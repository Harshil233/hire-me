/**
 * One page of rows plus the total that matched, as repositories return it. Lives in
 * `common` because it is a persistence concept, not any one module's domain type.
 */
export interface Page<TItem> {
  readonly items: readonly TItem[];
  readonly total: number;
}
