import { describe, expect, it } from 'vitest';

import { API_PREFIX } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import { buildOpenApiDocument } from '../openapi.document';
import type { JsonSchema, OperationObject, PathItemObject } from '../openapi.types';

const document = buildOpenApiDocument({ version: '1.2.3' });

const operations = (): readonly OperationObject[] =>
  Object.values(document.paths).flatMap((item: PathItemObject) => Object.values(item));

/** Collects every `$ref` target name anywhere in the document. */
const collectRefs = (node: unknown, found: Set<string> = new Set()): Set<string> => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, found));
    return found;
  }

  if (typeof node !== 'object' || node === null) {
    return found;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      found.add(value.replace('#/components/schemas/', ''));
    } else {
      collectRefs(value, found);
    }
  }

  return found;
};

describe('buildOpenApiDocument', () => {
  it('declares OpenAPI 3.1', () => {
    expect(document.openapi).toBe('3.1.0');
  });

  it('publishes the version it was given', () => {
    expect(document.info.version).toBe('1.2.3');
  });

  it('serves a relative server url, so it is right on localhost and behind a proxy alike', () => {
    expect(document.servers).toEqual([{ url: API_PREFIX, description: 'This server' }]);
  });

  it('requires a bearer token by default', () => {
    expect(document.security).toEqual([{ bearerAuth: [] }]);
  });

  it('describes both credentials the API issues', () => {
    expect(Object.keys(document.components.securitySchemes)).toEqual(['bearerAuth', 'refreshCookie']);
  });
});

describe('the document is internally consistent', () => {
  it('resolves every $ref to a declared component', () => {
    const declared = new Set(Object.keys(document.components.schemas));
    const dangling = [...collectRefs(document)].filter((name) => !declared.has(name));

    expect(dangling).toEqual([]);
  });

  it('uses every component it declares', () => {
    const used = collectRefs(document);
    // `Health` is inlined by the health path rather than referenced from another schema.
    const unused = Object.keys(document.components.schemas).filter((name) => !used.has(name));

    expect(unused).toEqual([]);
  });

  it('gives every operation a unique operationId', () => {
    const ids = operations().map((operation) => operation.operationId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tags every operation with a declared tag', () => {
    const declared = new Set(document.tags.map((tag) => tag.name));
    const undeclared = operations()
      .flatMap((operation) => operation.tags)
      .filter((tag) => !declared.has(tag));

    expect(undeclared).toEqual([]);
  });

  it('documents at least one response for every operation', () => {
    const withoutResponses = operations().filter(
      (operation) => Object.keys(operation.responses).length === 0,
    );

    expect(withoutResponses).toEqual([]);
  });

  it('summarises every operation', () => {
    expect(operations().every((operation) => operation.summary.length > 0)).toBe(true);
  });
});

describe('the contract reflects the API’s deliberate choices', () => {
  it('leaves only the genuinely public endpoints unauthenticated', () => {
    const publicOperations = Object.entries(document.paths)
      .flatMap(([path, item]) =>
        Object.values(item).map((operation) => ({ path, operation })),
      )
      .filter(({ operation }) => operation.security?.length === 0)
      .map(({ path }) => path);

    expect(new Set(publicOperations)).toEqual(
      new Set([
        '/candidate/register',
        '/hr/register',
        '/candidate/login',
        '/hr/login',
        '/refresh',
        '/logout',
        '/outreach/unsubscribe',
        '/health',
      ]),
    );
  });

  it('publishes the real error-code union rather than a hand-kept copy', () => {
    const schema = document.components.schemas.ErrorResponse as JsonSchema;
    const properties = schema.properties as Record<string, JsonSchema>;
    const error = properties.error as JsonSchema;
    const errorProperties = error.properties as Record<string, JsonSchema>;

    expect(errorProperties.code?.enum).toEqual(Object.values(ERROR_CODES));
  });

  it('derives schemas from the validators — a job body carries the real field set', () => {
    const createJob = document.components.schemas.CreateJobInput as JsonSchema;
    const properties = createJob.properties as Record<string, JsonSchema>;

    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining(['title', 'description', 'role', 'jobType', 'workMode', 'skills']),
    );
  });

  it('describes the profile route as answering either role’s profile', () => {
    const profile = document.components.schemas.ProfileView as JsonSchema;
    const properties = profile.properties as Record<string, JsonSchema>;

    expect(properties.profile).toEqual({
      oneOf: [
        { $ref: '#/components/schemas/CandidateProfile' },
        { $ref: '#/components/schemas/HrProfile' },
      ],
    });
  });

  it('documents the four owned sections identically, from one generator', () => {
    for (const section of ['experience', 'education', 'certification', 'project']) {
      expect(Object.keys(document.paths[`/${section}`] ?? {})).toEqual(['get', 'post']);
      expect(Object.keys(document.paths[`/${section}/{id}`] ?? {})).toEqual(['put', 'delete']);
    }
  });
});
