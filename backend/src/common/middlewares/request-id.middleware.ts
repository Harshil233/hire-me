import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { REQUEST_ID_HEADER } from '../../config/constants';

/**
 * Assigns a correlation id to every request, honouring an inbound `x-request-id`
 * so a trace survives across services.
 */
export const createRequestIdMiddleware = (
  generateId: () => string = randomUUID,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const inbound = req.get(REQUEST_ID_HEADER);
    req.requestId = inbound !== undefined && inbound.length > 0 ? inbound : generateId();
    res.setHeader(REQUEST_ID_HEADER, req.requestId);
    next();
  };
};
