import type { ZodError } from 'zod';

import type { ErrorDetail } from '../errors/app-error';

/** Root marker used when an issue is not attached to a specific field. */
export const ROOT_FIELD = '_root';

/**
 * Converts Zod issues into the per-field detail list used by the 422 response.
 * The single conversion point — validators and services never build details by hand.
 */
export const toErrorDetails = (error: ZodError): ErrorDetail[] =>
  error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : ROOT_FIELD,
    message: issue.message,
  }));
