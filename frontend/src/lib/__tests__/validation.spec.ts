import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  chipsField,
  countryCodeField,
  dateRangeRule,
  emailField,
  mobileNumberField,
  optionalAmountField,
  optionalDateField,
  optionalDobField,
  optionalHostedUrlField,
  optionalTextField,
  optionalUrlField,
  orNull,
  orUndefined,
  passwordField,
  pastDateField,
  requiredDateField,
  requiredTextField,
} from '../validation';

describe('emailField', () => {
  it('trims before validating', () => {
    expect(emailField.parse('  ada@example.com ')).toBe('ada@example.com');
  });

  it.each(['', 'nope', 'a@b'])('rejects %s', (value) => {
    expect(emailField.safeParse(value).success).toBe(false);
  });
});

describe('passwordField', () => {
  it('accepts a password meeting every rule', () => {
    expect(passwordField.safeParse('Str0ng!pass').success).toBe(true);
  });

  it.each(['Sh0rt!', 'alllower1!', 'ALLUPPER1!', 'NoDigits!!', 'NoSymbol123'])(
    'rejects %s',
    (value) => {
      expect(passwordField.safeParse(value).success).toBe(false);
    },
  );
});

describe('requiredTextField / optionalTextField', () => {
  it('trims and requires content', () => {
    expect(requiredTextField('Title').parse('  Engineer ')).toBe('Engineer');
    expect(requiredTextField('Title').safeParse('   ').success).toBe(false);
  });

  it('allows an empty optional field but caps its length', () => {
    expect(optionalTextField(10).parse('')).toBe('');
    expect(optionalTextField(3).safeParse('abcd').success).toBe(false);
  });
});

describe('optionalUrlField / optionalHostedUrlField', () => {
  it('treats an empty value as "not provided"', () => {
    expect(optionalUrlField().safeParse('').success).toBe(true);
  });

  it.each(['https://acme.test', 'http://acme.test/careers'])('accepts %s', (value) => {
    expect(optionalUrlField().safeParse(value).success).toBe(true);
  });

  it.each(['acme.test', 'ftp://acme.test', 'https://nodot'])('rejects %s', (value) => {
    expect(optionalUrlField().safeParse(value).success).toBe(false);
  });

  it('restricts a hosted URL to its allowed hosts', () => {
    const linkedin = optionalHostedUrlField(['linkedin.com'], 'LinkedIn');

    expect(linkedin.safeParse('').success).toBe(true);
    expect(linkedin.safeParse('https://www.linkedin.com/company/acme').success).toBe(true);
    expect(linkedin.safeParse('https://evil.test/linkedin.com').success).toBe(false);
  });
});

describe('date fields', () => {
  it('requires an ISO date', () => {
    expect(requiredDateField('Start date').safeParse('2024-01-01').success).toBe(true);
    expect(requiredDateField('Start date').safeParse('01/01/2024').success).toBe(false);
    expect(requiredDateField('Start date').safeParse('').success).toBe(false);
  });

  it('allows an empty optional date', () => {
    expect(optionalDateField().safeParse('').success).toBe(true);
    expect(optionalDateField().safeParse('nope').success).toBe(false);
  });

  it('rejects a future date where the past is required', () => {
    expect(pastDateField('Start date').safeParse('2999-01-01').success).toBe(false);
    expect(pastDateField('Start date').safeParse('2020-01-01').success).toBe(true);
  });

  it('enforces the age window on a date of birth', () => {
    const year = new Date().getUTCFullYear();

    expect(optionalDobField().safeParse('').success).toBe(true);
    expect(optionalDobField().safeParse(`${year - 30}-01-01`).success).toBe(true);
    expect(optionalDobField().safeParse(`${year - 5}-01-01`).success).toBe(false);
    expect(optionalDobField().safeParse(`${year - 150}-01-01`).success).toBe(false);
  });
});

describe('mobile fields', () => {
  it('validates the country code', () => {
    expect(countryCodeField.safeParse('+91').success).toBe(true);
    expect(countryCodeField.safeParse('91').success).toBe(false);
  });

  it('validates the number', () => {
    expect(mobileNumberField.safeParse('9876543210').success).toBe(true);
    expect(mobileNumberField.safeParse('98765abcde').success).toBe(false);
    expect(mobileNumberField.safeParse('123').success).toBe(false);
  });
});

describe('optionalAmountField', () => {
  it.each(['', '0', '1500000'])('accepts %s', (value) => {
    expect(optionalAmountField.safeParse(value).success).toBe(true);
  });

  it.each(['-1', '1.5', 'lots', '9999999999'])('rejects %s', (value) => {
    expect(optionalAmountField.safeParse(value).success).toBe(false);
  });
});

describe('chipsField', () => {
  it('accepts a list and enforces the entry limit', () => {
    expect(chipsField('Skills').safeParse(['TypeScript']).success).toBe(true);
    expect(
      chipsField('Skills').safeParse(Array.from({ length: 51 }, (_, i) => `s${i}`)).success,
    ).toBe(false);
  });

  it('rejects a blank entry', () => {
    expect(chipsField('Skills').safeParse(['  ']).success).toBe(false);
  });
});

describe('dateRangeRule', () => {
  const schema = z
    .object({ startDate: z.string(), endDate: z.string(), isCurrent: z.boolean() })
    .superRefine(dateRangeRule('startDate', 'endDate', 'isCurrent'));

  it('accepts an end date after the start date', () => {
    expect(
      schema.safeParse({ startDate: '2020-01-01', endDate: '2021-01-01', isCurrent: false })
        .success,
    ).toBe(true);
  });

  it('accepts an empty end date', () => {
    expect(
      schema.safeParse({ startDate: '2020-01-01', endDate: '', isCurrent: true }).success,
    ).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = schema.safeParse({
      startDate: '2021-01-01',
      endDate: '2020-01-01',
      isCurrent: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['endDate']);
  });

  it('rejects an end date on an ongoing entry', () => {
    const result = schema.safeParse({
      startDate: '2020-01-01',
      endDate: '2021-01-01',
      isCurrent: true,
    });

    expect(result.error?.issues[0]?.message).toMatch(/ongoing/);
  });

  it('works without an "ongoing" field', () => {
    const certification = z
      .object({ issuedOn: z.string(), expiresOn: z.string() })
      .superRefine(dateRangeRule('issuedOn', 'expiresOn'));

    expect(
      certification.safeParse({ issuedOn: '2021-01-01', expiresOn: '2020-01-01' }).success,
    ).toBe(false);
  });
});

describe('orUndefined / orNull', () => {
  it('maps a blank value to the API "absent" and "clear" markers', () => {
    expect(orUndefined('   ')).toBeUndefined();
    expect(orUndefined(' value ')).toBe('value');
    expect(orNull('   ')).toBeNull();
    expect(orNull(' value ')).toBe('value');
  });
});
