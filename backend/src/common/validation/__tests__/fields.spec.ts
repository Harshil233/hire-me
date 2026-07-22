import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  clearableField,
  createDateRangeRule,
  ctcSchema,
  dobSchema,
  emailSchema,
  genderSchema,
  hostedUrlSchema,
  isoDateSchema,
  mobileSchema,
  objectIdSchema,
  optionalField,
  passwordSchema,
  pastDateSchema,
  requiredName,
  requiredText,
  stringListSchema,
  urlSchema,
} from '../fields';

describe('emailSchema', () => {
  it('trims and lowercases before validating', () => {
    expect(emailSchema.parse('  Person@Example.COM ')).toBe('person@example.com');
  });

  it.each(['not-an-email', 'a@', '@b.com', ''])('rejects %s', (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(emailSchema.safeParse(42).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse('Str0ng!pass').success).toBe(true);
  });

  it.each([
    ['Sh0rt!a', 'shorter than eight characters'],
    ['alllower1!', 'no uppercase'],
    ['ALLUPPER1!', 'no lowercase'],
    ['NoDigits!!', 'no digit'],
    ['NoSymbol123', 'no symbol'],
  ])('rejects %s (%s)', (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });

  it('rejects an over-long password', () => {
    expect(passwordSchema.safeParse(`A1!${'a'.repeat(200)}`).success).toBe(false);
  });
});

describe('requiredName / requiredText', () => {
  it('trims the value', () => {
    expect(requiredName('First name').parse('  Ada  ')).toBe('Ada');
  });

  it('rejects blank input with a labelled message', () => {
    const result = requiredName('First name').safeParse('   ');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('First name');
  });

  it('caps the length', () => {
    expect(requiredText('Title', 5).safeParse('abcdef').success).toBe(false);
  });
});

describe('objectIdSchema', () => {
  it('accepts a 24-character hex string', () => {
    expect(objectIdSchema.safeParse('507f1f77bcf86cd799439011').success).toBe(true);
  });

  it.each(['507f1f77bcf86cd7994390', 'zzzf1f77bcf86cd799439011', ''])('rejects %s', (value) => {
    expect(objectIdSchema.safeParse(value).success).toBe(false);
  });
});

describe('mobileSchema', () => {
  it('accepts a country code and a numeric body', () => {
    expect(mobileSchema.parse({ countryCode: '+91', number: '9876543210' })).toEqual({
      countryCode: '+91',
      number: '9876543210',
    });
  });

  it.each([
    { countryCode: '91', number: '9876543210' },
    { countryCode: '+911', number: '123456' },
    { countryCode: '+91', number: '98765abcde' },
    { countryCode: '+91', number: '1234567890123456' },
  ])('rejects %o', (value) => {
    expect(mobileSchema.safeParse(value).success).toBe(false);
  });
});

describe('isoDateSchema / pastDateSchema / dobSchema', () => {
  it('converts an ISO date to a UTC Date', () => {
    expect(isoDateSchema.parse('2024-03-05').toISOString()).toBe('2024-03-05T00:00:00.000Z');
  });

  it.each(['05-03-2024', '2024-13-01', '2024-03-05T10:00:00Z', 'yesterday'])(
    'rejects %s',
    (value) => {
      expect(isoDateSchema.safeParse(value).success).toBe(false);
    },
  );

  it('rejects a future date where the past is required', () => {
    expect(pastDateSchema.safeParse('2999-01-01').success).toBe(false);
    expect(pastDateSchema.safeParse('2000-01-01').success).toBe(true);
  });

  it('rejects a date of birth that is too recent or too old', () => {
    const thisYear = new Date().getUTCFullYear();

    expect(dobSchema.safeParse(`${thisYear - 5}-01-01`).success).toBe(false);
    expect(dobSchema.safeParse(`${thisYear - 30}-01-01`).success).toBe(true);
    expect(dobSchema.safeParse(`${thisYear - 150}-01-01`).success).toBe(false);
  });
});

describe('urlSchema / hostedUrlSchema', () => {
  it('accepts http and https URLs', () => {
    expect(urlSchema.safeParse('https://acme.test/careers').success).toBe(true);
    expect(urlSchema.safeParse('http://acme.test').success).toBe(true);
  });

  it.each(['ftp://acme.test', 'acme.test', 'javascript:alert(1)'])('rejects %s', (value) => {
    expect(urlSchema.safeParse(value).success).toBe(false);
  });

  it('restricts a hosted URL to the allowed hosts and subdomains', () => {
    const linkedin = hostedUrlSchema(['linkedin.com'], 'LinkedIn');

    expect(linkedin.safeParse('https://www.linkedin.com/company/acme').success).toBe(true);
    expect(linkedin.safeParse('https://linkedin.com/in/ada').success).toBe(true);
    expect(linkedin.safeParse('https://evil.test/linkedin.com').success).toBe(false);
  });
});

describe('stringListSchema', () => {
  it('trims entries and drops case-insensitive duplicates', () => {
    expect(stringListSchema('Skills').parse([' React ', 'react', 'Node'])).toEqual([
      'React',
      'Node',
    ]);
  });

  it('rejects blank entries', () => {
    expect(stringListSchema('Skills').safeParse(['  ']).success).toBe(false);
  });

  it('enforces the item limit', () => {
    expect(stringListSchema('Skills', 2).safeParse(['a', 'b', 'c']).success).toBe(false);
  });

  it('enforces the per-item length limit', () => {
    expect(stringListSchema('Skills', 5, 3).safeParse(['abcd']).success).toBe(false);
  });
});

describe('ctcSchema', () => {
  it.each([0, 1_200_000])('accepts %s', (value) => {
    expect(ctcSchema.safeParse(value).success).toBe(true);
  });

  it.each([-1, 1.5, 2_000_000_000, '100'])('rejects %s', (value) => {
    expect(ctcSchema.safeParse(value).success).toBe(false);
  });
});

describe('genderSchema', () => {
  it('accepts a known value and rejects anything else', () => {
    expect(genderSchema.safeParse('female').success).toBe(true);
    expect(genderSchema.safeParse('unknown').success).toBe(false);
  });
});

describe('optionalField', () => {
  const schema = z.object({ website: optionalField(urlSchema) });

  it('treats an empty string and null as "not provided"', () => {
    expect(schema.parse({ website: '' }).website).toBeUndefined();
    expect(schema.parse({ website: null }).website).toBeUndefined();
    expect(schema.parse({}).website).toBeUndefined();
  });

  it('still validates a supplied value', () => {
    expect(schema.parse({ website: 'https://acme.test' }).website).toBe('https://acme.test');
    expect(schema.safeParse({ website: 'nope' }).success).toBe(false);
  });
});

describe('clearableField', () => {
  const schema = z.object({ designation: clearableField(requiredText('Designation')) });

  it('distinguishes "unchanged" from "cleared"', () => {
    expect(schema.parse({}).designation).toBeUndefined();
    expect(schema.parse({ designation: null }).designation).toBeNull();
    expect(schema.parse({ designation: '' }).designation).toBeNull();
    expect(schema.parse({ designation: 'Recruiter' }).designation).toBe('Recruiter');
  });
});

describe('createDateRangeRule', () => {
  const schema = z
    .object({
      startDate: isoDateSchema,
      endDate: optionalField(isoDateSchema),
      isCurrent: z.boolean().default(false),
    })
    .superRefine(createDateRangeRule());

  it('accepts an end date after the start date', () => {
    expect(schema.safeParse({ startDate: '2020-01-01', endDate: '2021-01-01' }).success).toBe(
      true,
    );
  });

  it('accepts an open-ended range', () => {
    expect(schema.safeParse({ startDate: '2020-01-01', isCurrent: true }).success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = schema.safeParse({ startDate: '2021-01-01', endDate: '2020-01-01' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['endDate']);
  });

  it('rejects an end date equal to the start date', () => {
    expect(schema.safeParse({ startDate: '2021-01-01', endDate: '2021-01-01' }).success).toBe(
      false,
    );
  });

  it('rejects an end date while the entry is marked ongoing', () => {
    const result = schema.safeParse({
      startDate: '2020-01-01',
      endDate: '2021-01-01',
      isCurrent: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/ongoing/);
  });

  it('supports custom field names', () => {
    const certification = z
      .object({ issuedOn: isoDateSchema, expiresOn: optionalField(isoDateSchema) })
      .superRefine(createDateRangeRule({ startField: 'issuedOn', endField: 'expiresOn' }));

    const result = certification.safeParse({ issuedOn: '2021-01-01', expiresOn: '2020-01-01' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['expiresOn']);
  });
});
