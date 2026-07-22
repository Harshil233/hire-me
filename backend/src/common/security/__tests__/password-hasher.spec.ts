import { describe, expect, it } from 'vitest';

import { BcryptPasswordHasher } from '../password-hasher';

// Cost 4 keeps the suite fast while still exercising the real algorithm.
const hasher = new BcryptPasswordHasher(4);

describe('BcryptPasswordHasher', () => {
  it('produces a bcrypt digest that is not the plain password', async () => {
    const hash = await hasher.hash('Str0ng!pass');

    expect(hash).not.toBe('Str0ng!pass');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('salts, so the same password hashes differently each time', async () => {
    expect(await hasher.hash('Str0ng!pass')).not.toBe(await hasher.hash('Str0ng!pass'));
  });

  it('confirms a matching password', async () => {
    const hash = await hasher.hash('Str0ng!pass');

    expect(await hasher.compare('Str0ng!pass', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('Str0ng!pass');

    expect(await hasher.compare('wrong', hash)).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(hasher.compare('anything', 'not-a-hash')).resolves.toBe(false);
  });
});
