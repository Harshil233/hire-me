import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../errors/error-codes';
import { AppError } from '../../errors/app-error';
import { JwtTokenService } from '../jwt-token.service';

const OPTIONS = {
  accessSecret: 'access-secret-that-is-long-enough-for-tests',
  accessTtl: '15m',
  refreshSecret: 'refresh-secret-that-is-long-enough-for-tests',
  refreshTtl: '7d',
};

const createService = (): JwtTokenService => {
  let counter = 0;
  return new JwtTokenService(OPTIONS, () => `id-${++counter}`);
};

describe('JwtTokenService — access tokens', () => {
  it('round-trips the subject and role', () => {
    const service = createService();
    const token = service.signAccessToken({ sub: 'user-1', role: ROLES.CANDIDATE });

    expect(service.verifyAccessToken(token)).toEqual({ sub: 'user-1', role: ROLES.CANDIDATE });
  });

  it('rejects a token signed with another secret', () => {
    const service = createService();
    const foreign = jwt.sign({ role: ROLES.HR }, 'a-completely-different-secret', {
      subject: 'user-1',
    });

    expect(() => service.verifyAccessToken(foreign)).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.TOKEN_INVALID }) as AppError,
    );
  });

  it('reports an expired token distinctly', () => {
    const service = createService();
    const expired = jwt.sign({ role: ROLES.CANDIDATE }, OPTIONS.accessSecret, {
      subject: 'user-1',
      expiresIn: '-1s',
    });

    expect(() => service.verifyAccessToken(expired)).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.TOKEN_EXPIRED }) as AppError,
    );
  });

  it('rejects a token whose payload does not match the schema', () => {
    const service = createService();
    const malformed = jwt.sign({ role: 'wizard' }, OPTIONS.accessSecret, { subject: 'user-1' });

    expect(() => service.verifyAccessToken(malformed)).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.TOKEN_INVALID }) as AppError,
    );
  });

  it('rejects garbage', () => {
    expect(() => createService().verifyAccessToken('not.a.token')).toThrow(AppError);
  });
});

describe('JwtTokenService — refresh tokens', () => {
  it('issues a token with a generated id, family and expiry', () => {
    const service = createService();
    const issued = service.signRefreshToken({ userId: 'user-1' });

    expect(issued.jti).toBe('id-1');
    expect(issued.family).toBe('id-2');
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('keeps an existing family when rotating', () => {
    const service = createService();
    const issued = service.signRefreshToken({ userId: 'user-1', family: 'family-a' });

    expect(issued.family).toBe('family-a');
    expect(service.verifyRefreshToken(issued.token).family).toBe('family-a');
  });

  it('round-trips the payload', () => {
    const service = createService();
    const issued = service.signRefreshToken({ userId: 'user-1' });
    const payload = service.verifyRefreshToken(issued.token);

    expect(payload.sub).toBe('user-1');
    expect(payload.jti).toBe(issued.jti);
    expect(payload.exp).toBe(Math.floor(issued.expiresAt.getTime() / 1000));
  });

  it('will not verify an access token as a refresh token', () => {
    const service = createService();
    const accessToken = service.signAccessToken({ sub: 'user-1', role: ROLES.HR });

    expect(() => service.verifyRefreshToken(accessToken)).toThrow(AppError);
  });

  it('rejects a refresh token missing its family claim', () => {
    const service = createService();
    const partial = jwt.sign({ jti: 'x' }, OPTIONS.refreshSecret, {
      subject: 'user-1',
      expiresIn: '1d',
    });

    expect(() => service.verifyRefreshToken(partial)).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.REFRESH_TOKEN_INVALID }) as AppError,
    );
  });

  it('defaults its id generator to a random UUID', () => {
    const issued = new JwtTokenService(OPTIONS).signRefreshToken({ userId: 'user-1' });

    expect(issued.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(issued.family).not.toBe(issued.jti);
  });

  it('uses the injected clock-independent expiry from the token itself', () => {
    const service = createService();
    const spy = vi.spyOn(jwt, 'sign');

    service.signRefreshToken({ userId: 'user-1' });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'id-1' }),
      OPTIONS.refreshSecret,
      expect.objectContaining({ expiresIn: '7d', subject: 'user-1' }),
    );
    spy.mockRestore();
  });
});
