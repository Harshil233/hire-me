import { createHash } from 'node:crypto';

/**
 * One-way digest used for at-rest storage of refresh tokens. Not for passwords —
 * those go through `IPasswordHasher`.
 */
export const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
