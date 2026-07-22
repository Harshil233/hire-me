import { z } from 'zod';

export const apiErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorBodySchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(apiErrorDetailSchema).default([]),
  }),
});

/** Normalised transport failure the UI can act on (field errors, retry, redirect). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: readonly ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** `true` when the server rejected specific fields. */
  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
export const UNEXPECTED_RESPONSE_CODE = 'UNEXPECTED_RESPONSE';

/** Builds an `ApiError` from whatever the transport produced. */
export const toApiError = (status: number | undefined, body: unknown): ApiError => {
  const parsed = apiErrorBodySchema.safeParse(body);

  if (parsed.success) {
    return new ApiError(
      status ?? 500,
      parsed.data.error.code,
      parsed.data.error.message,
      parsed.data.error.details,
    );
  }

  if (status === undefined) {
    return new ApiError(
      0,
      NETWORK_ERROR_CODE,
      'We could not reach the server. Check your connection and try again.',
    );
  }

  return new ApiError(status, UNEXPECTED_RESPONSE_CODE, 'Something went wrong. Please try again.');
};

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
