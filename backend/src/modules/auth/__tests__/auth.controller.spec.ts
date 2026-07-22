import { describe, expect, it, vi } from 'vitest';

import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import type { IUserService, User } from '../../user/user.interface';
import { AuthController } from '../auth.controller';
import type { AuthSession, IAuthService } from '../auth.interface';

const USER: User = {
  id: 'user-1',
  email: 'ada@example.com',
  role: ROLES.CANDIDATE,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const SESSION: AuthSession = {
  user: USER,
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

const createController = (): {
  controller: AuthController;
  authService: IAuthService;
  userService: IUserService;
} => {
  const authService: IAuthService = {
    registerCandidate: vi.fn(async () => SESSION),
    registerHr: vi.fn(async () => SESSION),
    login: vi.fn(async () => SESSION),
    refresh: vi.fn(async () => SESSION),
    logout: vi.fn(async () => undefined),
  };

  const userService: IUserService = {
    getById: vi.fn(async () => USER),
    assertEmailAvailable: vi.fn(async () => undefined),
  };

  return {
    controller: new AuthController(authService, userService, { secure: true, sameSite: 'lax' }),
    authService,
    userService,
  };
};

describe('AuthController — session responses', () => {
  it('answers registration with 201 and the access token in the body', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.registerCandidate(
      createMockRequest({ body: { email: 'ada@example.com' } }),
      res,
    );

    expect(res.capturedStatus).toBe(201);
    expect(res.capturedBody).toEqual({
      success: true,
      data: {
        user: { id: 'user-1', email: 'ada@example.com', role: ROLES.CANDIDATE },
        accessToken: 'access-token',
      },
    });
  });

  it('never puts the refresh token in the response body', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.loginAs(ROLES.CANDIDATE)(createMockRequest({ body: {} }), res);

    expect(JSON.stringify(res.capturedBody)).not.toContain('refresh-token');
  });

  it('sets the refresh token as a hardened httpOnly cookie', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.loginAs(ROLES.CANDIDATE)(createMockRequest({ body: {} }), res);

    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: REFRESH_COOKIE_PATH,
      }),
    );
  });

  it('answers HR registration with 201', async () => {
    const { controller, authService } = createController();
    const res = createMockResponse();

    await controller.registerHr(createMockRequest({ body: { company: { name: 'Acme' } } }), res);

    expect(authService.registerHr).toHaveBeenCalled();
    expect(res.capturedStatus).toBe(201);
  });

  it('answers login with 200', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.loginAs(ROLES.CANDIDATE)(createMockRequest({ body: {} }), res);

    expect(res.capturedStatus).toBe(200);
  });

  it('records the user agent against the session', async () => {
    const { controller, authService } = createController();

    await controller.loginAs(ROLES.CANDIDATE)(
      createMockRequest({ body: {}, headers: { 'user-agent': 'vitest-agent' } }),
      createMockResponse(),
    );

    expect(authService.login).toHaveBeenCalledWith(
      {},
      { userAgent: 'vitest-agent' },
      ROLES.CANDIDATE,
    );
  });

  it.each([[ROLES.CANDIDATE], [ROLES.HR]])(
    'passes the %s role from the route table, not the request body',
    async (role) => {
      const { controller, authService } = createController();

      await controller.loginAs(role)(
        // A client-supplied `role` must be ignored entirely.
        createMockRequest({ body: { role: 'hr' } }),
        createMockResponse(),
      );

      expect(authService.login).toHaveBeenCalledWith(
        { role: 'hr' },
        expect.anything(),
        role,
      );
    },
  );
});

describe('AuthController.refresh', () => {
  it('reads the refresh token from the cookie', async () => {
    const { controller, authService } = createController();

    await controller.refresh(
      createMockRequest({ cookies: { [REFRESH_COOKIE_NAME]: 'cookie-token' } }),
      createMockResponse(),
    );

    expect(authService.refresh).toHaveBeenCalledWith('cookie-token', expect.anything());
  });

  it('rejects a request with no refresh cookie', async () => {
    const { controller } = createController();

    await expect(
      controller.refresh(createMockRequest(), createMockResponse()),
    ).rejects.toMatchObject({ statusCode: 401, code: ERROR_CODES.REFRESH_TOKEN_INVALID });
  });

  it('rejects a non-string cookie value', async () => {
    const { controller } = createController();

    await expect(
      controller.refresh(
        createMockRequest({ cookies: { [REFRESH_COOKIE_NAME]: 42 } }),
        createMockResponse(),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('AuthController.logout', () => {
  it('revokes the session and clears the cookie', async () => {
    const { controller, authService } = createController();
    const res = createMockResponse();

    await controller.logout(
      createMockRequest({ cookies: { [REFRESH_COOKIE_NAME]: 'cookie-token' } }),
      res,
    );

    expect(authService.logout).toHaveBeenCalledWith('cookie-token');
    expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, expect.anything());
    expect(res.capturedBody).toEqual({ success: true, data: { loggedOut: true } });
  });

  it('still clears the cookie when none was sent', async () => {
    const { controller, authService } = createController();
    const res = createMockResponse();

    await controller.logout(createMockRequest(), res);

    expect(authService.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
  });
});

describe('AuthController.me', () => {
  it('returns the authenticated account', async () => {
    const { controller, userService } = createController();
    const res = createMockResponse();

    await controller.me(
      createMockRequest({ auth: { userId: 'user-1', role: ROLES.CANDIDATE } }),
      res,
    );

    expect(userService.getById).toHaveBeenCalledWith('user-1');
    expect(res.capturedBody).toEqual({
      success: true,
      data: { user: { id: 'user-1', email: 'ada@example.com', role: ROLES.CANDIDATE } },
    });
  });

  it('refuses without an authenticated identity', async () => {
    const { controller } = createController();

    await expect(controller.me(createMockRequest(), createMockResponse())).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
