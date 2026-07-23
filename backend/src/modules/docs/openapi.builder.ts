import { z } from 'zod';

import type {
  JsonSchema,
  MediaTypeObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
} from './openapi.types';

/**
 * Pure helpers that turn the API's own Zod schemas into OpenAPI fragments.
 *
 * The point of this file is that the published contract and the runtime validator are
 * the *same object*. A field renamed in `job.schema.ts` changes the documentation on the
 * next boot; documentation cannot drift from behaviour because there is nothing separate
 * to keep in step (CLAUDE.md §9 — one source of truth, never two).
 */

/**
 * Which side of a schema to describe.
 *
 * Zod schemas can transform, so a request body and a response body are different shapes
 * of the same object: `input` is what a client sends (before defaults and coercion),
 * `output` is what it gets back.
 */
export type SchemaIo = 'input' | 'output';

const JSON_MEDIA_TYPE = 'application/json';

/**
 * Converts a Zod schema to a JSON Schema fragment fit for `components.schemas`.
 *
 * `$schema` is dropped: it is correct at the root of a standalone document and noise
 * inside a component. `unrepresentable: 'any'` keeps constructs with no JSON Schema
 * equivalent (a `Date` output, a custom transform) from throwing — they widen to "any"
 * rather than taking the whole document down.
 */
export const jsonSchemaOf = (schema: z.ZodType, io: SchemaIo = 'input'): JsonSchema => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, {
    io,
    unrepresentable: 'any',
  });

  return rest;
};

/** A `$ref` pointing at a named component. */
export const ref = (name: string): JsonSchema => ({
  $ref: `#/components/schemas/${name}`,
});

/** Wraps a data schema in the success envelope every endpoint answers with (§13). */
export const successEnvelope = (data: JsonSchema): JsonSchema => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', const: true },
    data,
  },
});

/**
 * A list payload: the collection sits under its own key beside the paging block, so a
 * paginated response keeps the single envelope instead of inventing a second one.
 */
export const paginatedEnvelope = (key: string, item: JsonSchema): JsonSchema =>
  successEnvelope({
    type: 'object',
    required: [key, 'pagination'],
    properties: {
      [key]: { type: 'array', items: item },
      pagination: ref('PaginationMeta'),
    },
  });

/** An object payload with a single named key — `{ data: { job: {...} } }`. */
export const wrappedEnvelope = (key: string, value: JsonSchema): JsonSchema =>
  successEnvelope({
    type: 'object',
    required: [key],
    properties: { [key]: value },
  });

const jsonContent = (schema: JsonSchema, example?: unknown): Record<string, MediaTypeObject> => ({
  [JSON_MEDIA_TYPE]: example === undefined ? { schema } : { schema, example },
});

/** A required JSON request body described by a Zod schema. */
export const jsonBody = (schema: JsonSchema, description?: string): RequestBodyObject => ({
  ...(description === undefined ? {} : { description }),
  required: true,
  content: jsonContent(schema),
});

/** A JSON response. */
export const jsonResponse = (description: string, schema: JsonSchema): ResponseObject => ({
  description,
  content: jsonContent(schema),
});

/** A failure response. Every one of them shares the single error envelope. */
export const errorResponse = (description: string): ResponseObject => ({
  description,
  content: jsonContent(ref('ErrorResponse')),
});

/** A response with no body — `204`, and the file download whose body is binary. */
export const emptyResponse = (description: string): ResponseObject => ({ description });

/** A binary response body, for the file stream. */
export const binaryResponse = (description: string): ResponseObject => ({
  description,
  content: {
    'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
  },
});

/* -------------------------------------------------------------------------- */
/* Parameters                                                                  */
/* -------------------------------------------------------------------------- */

/** Narrows the `properties` map of a converted object schema. */
const readProperties = (schema: JsonSchema): Record<string, JsonSchema> => {
  const { properties } = schema;

  if (typeof properties !== 'object' || properties === null) {
    return {};
  }

  return properties as Record<string, JsonSchema>;
};

/** Narrows the `required` list of a converted object schema. */
const readRequired = (schema: JsonSchema): readonly string[] => {
  const { required } = schema;

  return Array.isArray(required) ? (required as string[]) : [];
};

/**
 * Derives query parameters from the Zod schema the route already validates its query
 * with, so a new filter is documented by the act of supporting it.
 *
 * `io: 'input'` is deliberate: a query arrives as strings and the schema coerces it, so
 * the *input* side is what a client actually sends.
 */
export const queryParameters = (schema: z.ZodType): readonly ParameterObject[] => {
  const converted = jsonSchemaOf(schema, 'input');
  const required = readRequired(converted);

  return Object.entries(readProperties(converted)).map(([name, propertySchema]) => {
    const { description, ...rest } = propertySchema;

    return {
      name,
      in: 'query' as const,
      ...(typeof description === 'string' ? { description } : {}),
      required: required.includes(name),
      schema: rest,
    };
  });
};

/** A path parameter. Every id in this API is a Mongo ObjectId. */
export const pathParameter = (name: string, description: string): ParameterObject => ({
  name,
  in: 'path',
  description,
  required: true,
  schema: { type: 'string', pattern: '^[a-f\\d]{24}$' },
});
