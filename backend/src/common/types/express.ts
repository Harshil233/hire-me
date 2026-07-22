import type { Role } from '../../config/constants';

/** Identity attached to a request once the access token has been verified. */
export interface AuthContext {
  readonly userId: string;
  readonly role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlation id assigned by the request-id middleware. */
      requestId: string;
      /** Present only on routes behind the `authenticate` middleware. */
      auth?: AuthContext;
    }
  }
}

export {};
