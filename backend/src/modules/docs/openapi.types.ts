/**
 * The slice of OpenAPI 3.1 this API actually uses.
 *
 * Hand-written rather than pulled from `openapi-types`: the document is assembled here,
 * so the only shapes worth type-checking are the ones we emit. A dependency would add a
 * few hundred unused members and one more thing to keep in step.
 */

/** A JSON Schema object. OpenAPI 3.1 schemas *are* JSON Schema (draft 2020-12). */
export interface JsonSchema {
  [key: string]: unknown;
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface MediaTypeObject {
  readonly schema: JsonSchema;
  readonly example?: unknown;
}

export interface RequestBodyObject {
  readonly description?: string;
  readonly required: boolean;
  readonly content: Readonly<Record<string, MediaTypeObject>>;
}

export interface ResponseObject {
  readonly description: string;
  readonly content?: Readonly<Record<string, MediaTypeObject>>;
}

export interface ParameterObject {
  readonly name: string;
  readonly in: 'query' | 'path' | 'header' | 'cookie';
  readonly description?: string;
  readonly required: boolean;
  readonly schema: JsonSchema;
}

export interface OperationObject {
  readonly tags: readonly string[];
  readonly summary: string;
  readonly description?: string;
  readonly operationId: string;
  readonly security?: readonly Readonly<Record<string, readonly string[]>>[];
  readonly parameters?: readonly ParameterObject[];
  readonly requestBody?: RequestBodyObject;
  readonly responses: Readonly<Record<string, ResponseObject>>;
}

export type PathItemObject = Partial<Record<HttpMethod, OperationObject>>;

export interface TagObject {
  readonly name: string;
  readonly description: string;
}

export interface ServerObject {
  readonly url: string;
  readonly description: string;
}

export interface SecuritySchemeObject {
  readonly type: string;
  readonly description: string;
  readonly scheme?: string;
  readonly bearerFormat?: string;
  readonly in?: string;
  readonly name?: string;
}

export interface OpenApiDocument {
  readonly openapi: string;
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly servers: readonly ServerObject[];
  /** Applied to every operation that does not override it with its own `security`. */
  readonly security: readonly Readonly<Record<string, readonly string[]>>[];
  readonly tags: readonly TagObject[];
  readonly paths: Readonly<Record<string, PathItemObject>>;
  readonly components: {
    readonly schemas: Readonly<Record<string, JsonSchema>>;
    readonly securitySchemes: Readonly<Record<string, SecuritySchemeObject>>;
  };
}
