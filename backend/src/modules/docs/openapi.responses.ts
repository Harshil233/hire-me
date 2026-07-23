import { errorResponse } from './openapi.builder';
import type { ResponseObject } from './openapi.types';

/**
 * The failure responses that recur across the API. Declaring them once keeps the
 * document honest about a deliberate design choice: a resource owned by somebody else
 * answers **404, not 403**, so the API cannot be used to probe for other accounts.
 */
export const RESPONSES = Object.freeze({
  validation: errorResponse('Validation failed. `error.details` carries the per-field reasons.'),
  unauthenticated: errorResponse('Missing, malformed or expired access token.'),
  forbiddenRole: errorResponse('The account type may not use this endpoint.'),
  notFound: errorResponse(
    'No such record — or one owned by another account. The two are deliberately indistinguishable.',
  ),
  conflict: errorResponse('The write collides with an existing record.'),
  tooLarge: errorResponse('The upload exceeds the configured size ceiling.'),
  rateLimited: errorResponse('Too many requests from this address.'),
}) satisfies Readonly<Record<string, ResponseObject>>;

/** The failure set every authenticated endpoint can return. */
export const AUTHENTICATED_ERRORS = Object.freeze({
  '401': RESPONSES.unauthenticated,
  '429': RESPONSES.rateLimited,
});

/** The failure set for an authenticated endpoint that also takes input. */
export const VALIDATED_ERRORS = Object.freeze({
  '401': RESPONSES.unauthenticated,
  '422': RESPONSES.validation,
  '429': RESPONSES.rateLimited,
});
