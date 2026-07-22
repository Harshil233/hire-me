import { describe, expect, it } from 'vitest';
import type { FieldErrors } from 'react-hook-form';

import { cn } from '../cn';
import { errorFor, fieldName } from '../form';
import { scorePassword } from '../password-strength';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('returns an empty string when nothing is supplied', () => {
    expect(cn()).toBe('');
  });
});

describe('errorFor', () => {
  it('reads a message by field name', () => {
    expect(
      errorFor({ email: { type: 'required', message: 'Required' } } as FieldErrors, 'email'),
    ).toBe('Required');
  });

  it('returns undefined when there is no error or no message', () => {
    expect(errorFor({} as FieldErrors, 'email')).toBeUndefined();
    expect(errorFor({ email: { type: 'required' } } as FieldErrors, 'email')).toBeUndefined();
  });
});

describe('fieldName', () => {
  it('passes the name through unchanged', () => {
    expect(fieldName('startDate')).toBe('startDate');
  });
});

describe('scorePassword', () => {
  it('scores an empty value as unset', () => {
    const result = scorePassword('');

    expect(result.score).toBe(0);
    expect(result.label).toBe('');
  });

  it('scores a single-rule password as weak', () => {
    expect(scorePassword('aaaaaaaaa').label).toBe('Weak');
  });

  it('scores a partially compliant password as fair', () => {
    expect(scorePassword('Password1').label).toBe('Fair');
  });

  it('scores a fully compliant password as strong', () => {
    const result = scorePassword('Str0ng!pass');

    expect(result.label).toBe('Strong');
    expect(result.score).toBe(result.maxScore);
  });
});
