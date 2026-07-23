import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A stateless unsubscribe link: the token is an HMAC of the user id, so nothing has to be
 * stored and a link cannot be forged without the secret. Compared in constant time, so a
 * guess cannot be refined by how long the comparison took.
 */
export const signUnsubscribeToken = (userId: string, secret: string): string =>
  createHmac('sha256', secret).update(userId).digest('hex');

export const isValidUnsubscribeToken = (
  userId: string,
  token: string,
  secret: string,
): boolean => {
  const expected = Buffer.from(signUnsubscribeToken(userId, secret), 'utf8');
  const actual = Buffer.from(token, 'utf8');

  // `timingSafeEqual` throws on a length mismatch, which is itself an answer.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
