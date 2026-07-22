import { useEffect } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { isApiError } from '@/services/api-error';

/** Server field names that do not match the flat form field names one-to-one. */
export type FieldNameMap = Readonly<Record<string, string>>;

/**
 * Projects a 422 (and the 409 duplicate-email case) back onto the offending inputs, so
 * the user sees the problem where they typed it instead of in a banner.
 */
export const useServerFieldErrors = <TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fieldNameMap: FieldNameMap = {},
): void => {
  useEffect(() => {
    if (!isApiError(error)) {
      return;
    }

    if (error.code === 'EMAIL_ALREADY_EXISTS') {
      setError('email' as Path<TValues>, { type: 'server', message: error.message });
      return;
    }

    for (const detail of error.details) {
      const field = fieldNameMap[detail.field] ?? detail.field;
      setError(field as Path<TValues>, { type: 'server', message: detail.message });
    }
  }, [error, setError, fieldNameMap]);
};
