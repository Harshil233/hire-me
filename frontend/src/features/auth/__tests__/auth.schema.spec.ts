import { describe, expect, it } from 'vitest';

import {
  candidateRegisterFormSchema,
  hrRegisterFormSchema,
  loginFormSchema,
} from '../schemas/auth.schema';

const CANDIDATE = {
  email: 'ada@example.com',
  password: 'Str0ng!pass',
  confirmPassword: 'Str0ng!pass',
  firstName: 'Ada',
  middleName: '',
  lastName: 'Lovelace',
};

const HR = {
  ...CANDIDATE,
  email: 'grace@acme.test',
  designation: '',
  companyName: 'Acme Corp',
  companyDomain: '',
  companyHeadquarters: '',
  companyWebsiteUrl: '',
  companyLinkedinUrl: '',
};

describe('loginFormSchema', () => {
  it('accepts an email and any non-empty password', () => {
    expect(loginFormSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success).toBe(
      true,
    );
  });

  it('rejects a blank password without revealing the policy', () => {
    const result = loginFormSchema.safeParse({ email: 'ada@example.com', password: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Password is required');
  });
});

describe('candidateRegisterFormSchema', () => {
  it('accepts a complete form', () => {
    expect(candidateRegisterFormSchema.safeParse(CANDIDATE).success).toBe(true);
  });

  it('reports mismatched passwords on the confirmation field', () => {
    const result = candidateRegisterFormSchema.safeParse({
      ...CANDIDATE,
      confirmPassword: 'Different1!',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });

  it('enforces the password policy', () => {
    const result = candidateRegisterFormSchema.safeParse({
      ...CANDIDATE,
      password: 'weak',
      confirmPassword: 'weak',
    });

    expect(result.success).toBe(false);
  });

  it('requires both names', () => {
    const result = candidateRegisterFormSchema.safeParse({
      ...CANDIDATE,
      firstName: '',
      lastName: '',
    });

    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toContain('firstName');
    expect(fields).toContain('lastName');
  });
});

describe('hrRegisterFormSchema', () => {
  it('accepts a company with only a name', () => {
    expect(hrRegisterFormSchema.safeParse(HR).success).toBe(true);
  });

  it('requires the company name', () => {
    const result = hrRegisterFormSchema.safeParse({ ...HR, companyName: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['companyName']);
  });

  it('validates optional company links', () => {
    expect(hrRegisterFormSchema.safeParse({ ...HR, companyWebsiteUrl: 'nope' }).success).toBe(
      false,
    );
    expect(
      hrRegisterFormSchema.safeParse({ ...HR, companyLinkedinUrl: 'https://evil.test' }).success,
    ).toBe(false);
    expect(hrRegisterFormSchema.safeParse({ ...HR, companyDomain: 'not a domain' }).success).toBe(
      false,
    );
  });

  it('accepts a valid domain and LinkedIn link', () => {
    expect(
      hrRegisterFormSchema.safeParse({
        ...HR,
        companyDomain: 'acme.com',
        companyLinkedinUrl: 'https://www.linkedin.com/company/acme',
      }).success,
    ).toBe(true);
  });
});
