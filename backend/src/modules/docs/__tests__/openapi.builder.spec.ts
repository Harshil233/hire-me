import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  binaryResponse,
  emptyResponse,
  errorResponse,
  jsonBody,
  jsonResponse,
  jsonSchemaOf,
  paginatedEnvelope,
  pathParameter,
  queryParameters,
  ref,
  successEnvelope,
  wrappedEnvelope,
} from '../openapi.builder';

describe('jsonSchemaOf', () => {
  it('converts a Zod object to JSON Schema', () => {
    const schema = jsonSchemaOf(z.object({ title: z.string().min(1).max(10) }));

    expect(schema).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string', minLength: 1, maxLength: 10 } },
      required: ['title'],
    });
  });

  it('drops $schema, which is noise inside a component', () => {
    expect(jsonSchemaOf(z.object({ id: z.string() }))).not.toHaveProperty('$schema');
  });

  it('describes the input side by default, so defaults stay optional for the client', () => {
    const schema = jsonSchemaOf(z.object({ page: z.number().default(1) }));

    expect(schema.required).toBeUndefined();
  });

  it('describes the output side on request, where a defaulted field is always present', () => {
    const schema = jsonSchemaOf(z.object({ page: z.number().default(1) }), 'output');

    expect(schema.required).toEqual(['page']);
  });

  it('widens a construct with no JSON Schema equivalent instead of throwing', () => {
    const schema = jsonSchemaOf(z.object({ when: z.date() }));

    expect(schema).toHaveProperty('properties.when');
  });
});

describe('envelopes', () => {
  it('wraps data in the success envelope', () => {
    expect(successEnvelope({ type: 'string' })).toEqual({
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', const: true },
        data: { type: 'string' },
      },
    });
  });

  it('puts a collection beside the paging block under one envelope', () => {
    const schema = paginatedEnvelope('jobs', ref('Job'));

    expect(schema).toMatchObject({
      properties: {
        data: {
          required: ['jobs', 'pagination'],
          properties: {
            jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
      },
    });
  });

  it('wraps a single resource under its own key', () => {
    expect(wrappedEnvelope('job', ref('Job'))).toMatchObject({
      properties: { data: { required: ['job'] } },
    });
  });
});

describe('ref', () => {
  it('points at a named component', () => {
    expect(ref('Job')).toEqual({ $ref: '#/components/schemas/Job' });
  });
});

describe('bodies and responses', () => {
  it('marks a JSON request body required', () => {
    expect(jsonBody(ref('LoginInput'))).toEqual({
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
    });
  });

  it('carries a description when one is given', () => {
    expect(jsonBody(ref('LoginInput'), 'Credentials')).toHaveProperty('description', 'Credentials');
  });

  it('builds a JSON response', () => {
    expect(jsonResponse('Signed in.', ref('AuthSession'))).toEqual({
      description: 'Signed in.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSession' } } },
    });
  });

  it('points every failure at the one error envelope', () => {
    expect(errorResponse('Nope.')).toEqual({
      description: 'Nope.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    });
  });

  it('builds a body-less response', () => {
    expect(emptyResponse('Deleted.')).toEqual({ description: 'Deleted.' });
  });

  it('builds a binary response for the file stream', () => {
    expect(binaryResponse('The file.')).toMatchObject({
      content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
    });
  });
});

describe('queryParameters', () => {
  const schema = z.object({
    page: z.coerce.number().int().positive().default(1),
    search: z.string().optional(),
    jobId: z.string(),
  });

  it('derives one parameter per property of the validating schema', () => {
    expect(queryParameters(schema).map((parameter) => parameter.name)).toEqual([
      'page',
      'search',
      'jobId',
    ]);
  });

  it('marks them as query parameters', () => {
    expect(queryParameters(schema).every((parameter) => parameter.in === 'query')).toBe(true);
  });

  it('carries the schema’s own requiredness', () => {
    const byName = new Map(queryParameters(schema).map((p) => [p.name, p.required]));

    expect(byName.get('jobId')).toBe(true);
    expect(byName.get('search')).toBe(false);
    expect(byName.get('page')).toBe(false);
  });

  it('lifts a field description out of the schema and onto the parameter', () => {
    const described = z.object({ q: z.string().describe('Free text search.') });

    expect(queryParameters(described)[0]).toMatchObject({
      description: 'Free text search.',
      schema: { type: 'string' },
    });
  });

  it('leaves the description out of the parameter schema, where it would be duplicated', () => {
    const described = z.object({ q: z.string().describe('Free text search.') });

    expect(queryParameters(described)[0]?.schema).not.toHaveProperty('description');
  });

  it('returns nothing for a schema with no properties', () => {
    expect(queryParameters(z.object({}))).toEqual([]);
  });

  it('survives a schema that is not an object', () => {
    expect(queryParameters(z.string())).toEqual([]);
  });
});

describe('pathParameter', () => {
  it('is required and shaped like an ObjectId', () => {
    expect(pathParameter('id', 'Id of the job.')).toEqual({
      name: 'id',
      in: 'path',
      description: 'Id of the job.',
      required: true,
      schema: { type: 'string', pattern: '^[a-f\\d]{24}$' },
    });
  });
});
