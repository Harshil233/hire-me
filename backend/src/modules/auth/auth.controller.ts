import type { CookieOptions, Request, Response } from 'express';

import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, type Role } from '../../config/constants';
import { UnauthorizedError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { HTTP_STATUS, sendSuccess } from '../../common/http/api-response';
import type { IUserService } from '../user/user.interface';
import type { AuthSession, IAuthService } from './auth.interface';
import type { AuthSessionResponse, LoginInput, RegisterCandidateInput, RegisterHrInput } from './auth.schema';

export interface RefreshCookieConfig {
  readonly secure: boolean;
  readonly sameSite: 'lax' | 'strict' | 'none';
}

type LoginHandler = (
  req: Request<Record<string, never>, unknown, LoginInput>,
  res: Response,
) => Promise<void>;

/** HTTP-only concerns (cookies, status codes) live here, never in the service. */
export class AuthController {
  constructor(
    private readonly authService: IAuthService,
    private readonly userService: IUserService,
    private readonly cookieConfig: RefreshCookieConfig,
  ) {}

  registerCandidate = async (
    req: Request<Record<string, never>, unknown, RegisterCandidateInput>,
    res: Response,
  ): Promise<void> => {
    const session = await this.authService.registerCandidate(req.body, this.readMeta(req));
    this.respondWithSession(res, session, HTTP_STATUS.CREATED);
  };

  registerHr = async (
    req: Request<Record<string, never>, unknown, RegisterHrInput>,
    res: Response,
  ): Promise<void> => {
    const session = await this.authService.registerHr(req.body, this.readMeta(req));
    this.respondWithSession(res, session, HTTP_STATUS.CREATED);
  };

  /**
   * Builds the handler for one role's login path. The role comes from the route table,
   * never from the request, so a client cannot choose which role it authenticates as.
   */
  loginAs =
    (expectedRole: Role): LoginHandler =>
    async (req, res): Promise<void> => {
      const session = await this.authService.login(req.body, this.readMeta(req), expectedRole);
      this.respondWithSession(res, session);
    };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const session = await this.authService.refresh(
      AuthController.readRefreshCookie(req),
      this.readMeta(req),
    );
    this.respondWithSession(res, session);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const token: unknown = req.cookies[REFRESH_COOKIE_NAME];

    if (typeof token === 'string' && token.length > 0) {
      await this.authService.logout(token);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions(0));
    sendSuccess(res, { loggedOut: true });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const user = await this.userService.getById(userId);
    sendSuccess(res, { user: { id: user.id, email: user.email, role: user.role } });
  };

  private respondWithSession(
    res: Response,
    session: AuthSession,
    statusCode: number = HTTP_STATUS.OK,
  ): void {
    const maxAge = Math.max(session.refreshExpiresAt.getTime() - Date.now(), 0);
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, this.cookieOptions(maxAge));

    const body: AuthSessionResponse = {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      accessToken: session.accessToken,
    };

    sendSuccess(res, body, statusCode);
  }

  private cookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieConfig.secure,
      sameSite: this.cookieConfig.sameSite,
      path: REFRESH_COOKIE_PATH,
      maxAge,
    };
  }

  private readMeta(req: Request): { userAgent?: string | undefined } {
    return { userAgent: req.get('user-agent') };
  }

  private static readRefreshCookie(req: Request): string {
    const token: unknown = req.cookies[REFRESH_COOKIE_NAME];

    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedError(
        'Your session has expired, please sign in again',
        ERROR_CODES.REFRESH_TOKEN_INVALID,
      );
    }

    return token;
  }
}
