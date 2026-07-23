import type { ComponentType } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

/** How one record is rendered in a section list. */
export interface SectionItemView {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly meta?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly link?: string;
}

/**
 * Everything that makes one profile section different from another. The list, the
 * modal, the API calls and the cache handling are shared (CLAUDE.md §9); a section only
 * declares its schema, its mapping and its form fields.
 */
export interface SectionConfig<TItem, TValues extends FieldValues> {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  /** API path segment, e.g. `/experience`. */
  readonly resourcePath: string;
  readonly pluralKey: string;
  readonly singularKey: string;
  readonly addLabel: string;
  readonly emptyTitle: string;
  readonly itemSchema: ZodType<TItem>;
  /** Input and output types match, which is what the form resolver needs. */
  readonly formSchema: ZodType<TValues, TValues>;
  readonly emptyValues: TValues;
  toValues(item: TItem): TValues;
  toPayload(values: TValues): Record<string, unknown>;
  /** A property rather than a method, so it can be passed to a read-only renderer. */
  readonly present: (item: TItem) => SectionItemView;
  readonly FormFields: ComponentType<{ form: UseFormReturn<TValues> }>;
}
