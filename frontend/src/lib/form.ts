import type { FieldErrors, FieldValues, Path } from 'react-hook-form';

/**
 * Reads an error message by field name from a generically-typed form. Generic form
 * components cannot index `errors` statically, and this keeps the lookup in one place.
 */
export const errorFor = <TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  name: string,
): string | undefined => {
  const entry = (errors as Record<string, { message?: unknown } | undefined>)[name];
  return typeof entry?.message === 'string' ? entry.message : undefined;
};

/** Narrows a literal field name to the form's `Path` type. */
export const fieldName = <TValues extends FieldValues>(name: string): Path<TValues> =>
  name as Path<TValues>;
