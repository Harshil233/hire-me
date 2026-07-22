import { describe, expect, it } from 'vitest';

import { candidateProfile, company, hrProfile } from '@/test/fixtures';
import {
  toCandidatePersonalPayload,
  toCandidatePersonalValues,
  toCompanyPayload,
  toCompanyValues,
  toHrPersonalPayload,
  toHrPersonalValues,
  toJobPreferencesPayload,
  toJobPreferencesValues,
} from '../api/profile.mappers';

describe('candidate personal mapping', () => {
  it('fills a form from an empty profile without producing undefined controls', () => {
    const values = toCandidatePersonalValues(candidateProfile);

    expect(values).toEqual({
      firstName: 'Ada',
      middleName: '',
      lastName: 'Lovelace',
      gender: '',
      dob: '',
      countryCode: '',
      mobileNumber: '',
      currentLocation: '',
    });
  });

  it('splits the mobile object into its two controls', () => {
    const values = toCandidatePersonalValues({
      ...candidateProfile,
      mobile: { countryCode: '+91', number: '9876543210' },
      dob: '1990-05-04T00:00:00.000Z',
      gender: 'female',
    });

    expect(values.countryCode).toBe('+91');
    expect(values.mobileNumber).toBe('9876543210');
    expect(values.dob).toBe('1990-05-04');
    expect(values.gender).toBe('female');
  });

  it('sends null for cleared optional fields', () => {
    const payload = toCandidatePersonalPayload({
      firstName: 'Ada',
      middleName: '',
      lastName: 'Lovelace',
      gender: '',
      dob: '',
      countryCode: '',
      mobileNumber: '',
      currentLocation: '',
    });

    expect(payload).toEqual({
      firstName: 'Ada',
      middleName: null,
      lastName: 'Lovelace',
      gender: null,
      dob: null,
      currentLocation: null,
      mobile: null,
    });
  });

  it('rebuilds the mobile object when both halves are present', () => {
    const payload = toCandidatePersonalPayload({
      firstName: 'Ada',
      middleName: 'B',
      lastName: 'Lovelace',
      gender: 'female',
      dob: '1990-05-04',
      countryCode: '+91',
      mobileNumber: '9876543210',
      currentLocation: 'Pune',
    });

    expect(payload.mobile).toEqual({ countryCode: '+91', number: '9876543210' });
    expect(payload.dob).toBe('1990-05-04');
  });

  it('clears the mobile when only one half is filled in', () => {
    const payload = toCandidatePersonalPayload({
      firstName: 'Ada',
      middleName: '',
      lastName: 'Lovelace',
      gender: '',
      dob: '',
      countryCode: '+91',
      mobileNumber: '',
      currentLocation: '',
    });

    expect(payload.mobile).toBeNull();
  });
});

describe('HR personal mapping', () => {
  it('round-trips the designation', () => {
    const values = toHrPersonalValues({ ...hrProfile, designation: 'Talent Lead' });
    expect(values.designation).toBe('Talent Lead');

    expect(toHrPersonalPayload(values).designation).toBe('Talent Lead');
    expect(toHrPersonalPayload({ ...values, designation: '' }).designation).toBeNull();
  });
});

describe('job preferences mapping', () => {
  it('renders amounts as text for the form', () => {
    const values = toJobPreferencesValues({
      ...candidateProfile,
      currentCtc: 1_200_000,
      expectedCtc: 1_800_000,
      skills: ['TypeScript'],
    });

    expect(values.currentCtc).toBe('1200000');
    expect(values.skills).toEqual(['TypeScript']);
  });

  it('leaves amounts blank when unset', () => {
    expect(toJobPreferencesValues(candidateProfile).currentCtc).toBe('');
  });

  it('converts amounts back to numbers, and blanks to null', () => {
    const payload = toJobPreferencesPayload({
      preferredLocations: ['Pune'],
      skills: ['Go'],
      jobTypes: ['full_time'],
      currentCtc: '1200000',
      expectedCtc: '',
    });

    expect(payload.currentCtc).toBe(1_200_000);
    expect(payload.expectedCtc).toBeNull();
    expect(payload.jobTypes).toEqual(['full_time']);
  });
});

describe('company mapping', () => {
  it('produces blank controls for a missing company', () => {
    const values = toCompanyValues(null);

    expect(values.name).toBe('');
    expect(values.locations).toEqual([]);
  });

  it('fills the form from a company', () => {
    const values = toCompanyValues({ ...company, description: 'We build things' });

    expect(values.name).toBe('Acme Corp');
    expect(values.description).toBe('We build things');
  });

  it('omits blank optional fields, because an empty PUT is rejected', () => {
    const payload = toCompanyPayload(toCompanyValues(company));

    expect(payload).toEqual({ name: 'Acme Corp', locations: [] });
    expect('description' in payload).toBe(false);
  });

  it('lowercases the domain and keeps filled-in links', () => {
    const payload = toCompanyPayload({
      ...toCompanyValues(company),
      domain: 'ACME.com',
      websiteUrl: ' https://acme.test ',
    });

    expect(payload.domain).toBe('acme.com');
    expect(payload.websiteUrl).toBe('https://acme.test');
  });
});
