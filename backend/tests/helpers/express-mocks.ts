import type { Request, Response } from 'express';
import { vi, type Mock } from 'vitest';

import type { AuthContext } from '../../src/common/types/express';

export interface MockRequestOptions {
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly params?: Record<string, string>;
  readonly query?: Record<string, unknown>;
  readonly cookies?: Record<string, unknown>;
  readonly auth?: AuthContext;
  readonly method?: string;
  readonly originalUrl?: string;
  readonly requestId?: string;
  readonly file?: Express.Multer.File;
}

/**
 * Minimal Express request stand-in for controller and middleware unit tests.
 * The return type is inferred from the call site so it satisfies controllers that
 * narrow `Request` with params/body generics.
 */
export const createMockRequest = <TRequest extends Request = Request>(
  options: MockRequestOptions = {},
): TRequest => {
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const request = {
    headers,
    get: (name: string): string | undefined => headers[name.toLowerCase()],
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    cookies: options.cookies ?? {},
    method: options.method ?? 'GET',
    originalUrl: options.originalUrl ?? '/',
    requestId: options.requestId ?? 'test-request-id',
    ...(options.auth !== undefined ? { auth: options.auth } : {}),
    ...(options.file !== undefined ? { file: options.file } : {}),
  };

  return request as unknown as TRequest;
};

export interface MockResponse extends Response {
  readonly statusMock: Mock;
  readonly jsonMock: Mock;
  readonly sendMock: Mock;
  readonly cookieMock: Mock;
  readonly clearCookieMock: Mock;
  readonly setHeaderMock: Mock;
  /** Status code captured from the last `status()` call. */
  capturedStatus: number | undefined;
  capturedBody: unknown;
}

export const createMockResponse = (): MockResponse => {
  const response = {
    capturedStatus: undefined as number | undefined,
    capturedBody: undefined as unknown,
  } as MockResponse;

  const statusMock = vi.fn((code: number) => {
    response.capturedStatus = code;
    return response;
  });
  const jsonMock = vi.fn((body: unknown) => {
    response.capturedBody = body;
    return response;
  });
  const sendMock = vi.fn((body?: unknown) => {
    response.capturedBody = body;
    return response;
  });

  return Object.assign(response, {
    status: statusMock,
    json: jsonMock,
    send: sendMock,
    cookie: vi.fn(() => response),
    clearCookie: vi.fn(() => response),
    setHeader: vi.fn(() => response),
    statusMock,
    jsonMock,
    sendMock,
    cookieMock: vi.fn(),
    clearCookieMock: vi.fn(),
    setHeaderMock: vi.fn(),
  }) as MockResponse;
};

/** Captures whatever a middleware passes to `next`. */
export const createNext = (): Mock => vi.fn();
