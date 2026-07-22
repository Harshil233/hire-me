import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ROOT_FIELD, toErrorDetails } from '../zod-details';

describe('toErrorDetails', () => {
  it('maps each issue to its dotted field path', () => {
    const schema = z.object({ user: z.object({ email: z.string() }) });
    const result = schema.safeParse({ user: { email: 42 } });

    expect(result.success).toBe(false);
    const details = toErrorDetails(result.error!);

    expect(details).toHaveLength(1);
    expect(details[0]?.field).toBe('user.email');
    expect(details[0]?.message.length).toBeGreaterThan(0);
  });

  it('reports one detail per failing field', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const result = schema.safeParse({});

    const details = toErrorDetails(result.error!);

    expect(details.map((detail) => detail.field).sort()).toEqual(['a', 'b']);
  });

  it('falls back to the root marker for object-level issues', () => {
    const schema = z.object({ a: z.string() }).refine(() => false, 'whole object is wrong');
    const result = schema.safeParse({ a: 'ok' });

    expect(toErrorDetails(result.error!)[0]).toEqual({
      field: ROOT_FIELD,
      message: 'whole object is wrong',
    });
  });

  it('uses indexes for array issues', () => {
    const schema = z.object({ skills: z.array(z.string().min(2)) });
    const result = schema.safeParse({ skills: ['ok', 'x'] });

    expect(toErrorDetails(result.error!)[0]?.field).toBe('skills.1');
  });
});
