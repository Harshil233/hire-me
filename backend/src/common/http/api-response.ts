import type { Response } from 'express';

import type { ErrorDetail } from '../errors/app-error';
import type { ErrorCode } from '../errors/error-codes';

export interface SuccessResponse<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ErrorResponseBody {
  readonly success: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details: readonly ErrorDetail[];
  };
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
} as const;

/** Builds the success envelope. The only place its shape is defined. */
export const buildSuccessBody = <TData>(data: TData): SuccessResponse<TData> => ({
  success: true,
  data,
});

/** Builds the failure envelope. Used exclusively by the error middleware. */
export const buildErrorBody = (
  code: ErrorCode,
  message: string,
  details: readonly ErrorDetail[] = [],
): ErrorResponseBody => ({
  success: false,
  error: { code, message, details },
});

export const sendSuccess = (
  res: Response,
  data: unknown,
  statusCode: number = HTTP_STATUS.OK,
): void => {
  res.status(statusCode).json(buildSuccessBody(data));
};

export const sendNoContent = (res: Response): void => {
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

/** Paging block that rides inside `data` alongside the resource key, keeping one envelope. */
export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export const toPaginationMeta = (
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta => ({
  page,
  pageSize,
  total,
  // A page count of zero would make "page 1 of 0" render for an empty list.
  totalPages: Math.max(Math.ceil(total / pageSize), 1),
});
