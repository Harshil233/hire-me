import { toDateInputValue } from '@/lib/format';
import { orNull } from '@/lib/validation';
import type {
  CandidatePersonalFormValues,
  CandidateProfile,
  Company,
  CompanyFormValues,
  HrPersonalFormValues,
  HrProfile,
  JobPreferencesFormValues,
} from '../schemas/profile.schema';

/**
 * Form ⇄ API translation. Kept out of the components so both directions are pure and
 * unit-testable (CLAUDE.md §9, §10).
 *
 * An empty control means "clear this value", which the API expresses as `null`.
 */

const mobilePayload = (countryCode: string, mobileNumber: string): unknown =>
  countryCode === '' || mobileNumber === '' ? null : { countryCode, number: mobileNumber };

export const toCandidatePersonalValues = (
  profile: CandidateProfile,
): CandidatePersonalFormValues => ({
  firstName: profile.firstName,
  middleName: profile.middleName ?? '',
  lastName: profile.lastName,
  gender: profile.gender ?? '',
  dob: toDateInputValue(profile.dob),
  countryCode: profile.mobile?.countryCode ?? '',
  mobileNumber: profile.mobile?.number ?? '',
  currentLocation: profile.currentLocation ?? '',
});

export const toCandidatePersonalPayload = (
  values: CandidatePersonalFormValues,
): Record<string, unknown> => ({
  firstName: values.firstName,
  middleName: orNull(values.middleName),
  lastName: values.lastName,
  gender: orNull(values.gender),
  dob: orNull(values.dob),
  currentLocation: orNull(values.currentLocation),
  mobile: mobilePayload(values.countryCode, values.mobileNumber),
});

export const toHrPersonalValues = (profile: HrProfile): HrPersonalFormValues => ({
  firstName: profile.firstName,
  middleName: profile.middleName ?? '',
  lastName: profile.lastName,
  designation: profile.designation ?? '',
  gender: profile.gender ?? '',
  dob: toDateInputValue(profile.dob),
  countryCode: profile.mobile?.countryCode ?? '',
  mobileNumber: profile.mobile?.number ?? '',
});

export const toHrPersonalPayload = (values: HrPersonalFormValues): Record<string, unknown> => ({
  firstName: values.firstName,
  middleName: orNull(values.middleName),
  lastName: values.lastName,
  designation: orNull(values.designation),
  gender: orNull(values.gender),
  dob: orNull(values.dob),
  mobile: mobilePayload(values.countryCode, values.mobileNumber),
});

export const toJobPreferencesValues = (profile: CandidateProfile): JobPreferencesFormValues => ({
  preferredLocations: [...profile.preferredLocations],
  skills: [...profile.skills],
  jobTypes: [...profile.jobTypes],
  currentCtc: profile.currentCtc === undefined ? '' : String(profile.currentCtc),
  expectedCtc: profile.expectedCtc === undefined ? '' : String(profile.expectedCtc),
});

export const toJobPreferencesPayload = (
  values: JobPreferencesFormValues,
): Record<string, unknown> => ({
  preferredLocations: values.preferredLocations,
  skills: values.skills,
  jobTypes: values.jobTypes,
  currentCtc: values.currentCtc === '' ? null : Number(values.currentCtc),
  expectedCtc: values.expectedCtc === '' ? null : Number(values.expectedCtc),
});

export const toCompanyValues = (company: Company | null): CompanyFormValues => ({
  name: company?.name ?? '',
  description: company?.description ?? '',
  headquarters: company?.headquarters ?? '',
  locations: [...(company?.locations ?? [])],
  domain: company?.domain ?? '',
  websiteUrl: company?.websiteUrl ?? '',
  linkedinUrl: company?.linkedinUrl ?? '',
  facebookUrl: company?.facebookUrl ?? '',
  instagramUrl: company?.instagramUrl ?? '',
  googleMapsLink: company?.googleMapsLink ?? '',
  address: company?.address ?? '',
});

/**
 * `PUT /company/:id` replaces the fields it receives, and rejects an empty body, so
 * blank optional inputs are omitted rather than sent as null.
 */
export const toCompanyPayload = (values: CompanyFormValues): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    name: values.name,
    locations: values.locations,
  };

  const optionalEntries: readonly [string, string][] = [
    ['description', values.description],
    ['headquarters', values.headquarters],
    ['domain', values.domain.toLowerCase()],
    ['websiteUrl', values.websiteUrl],
    ['linkedinUrl', values.linkedinUrl],
    ['facebookUrl', values.facebookUrl],
    ['instagramUrl', values.instagramUrl],
    ['googleMapsLink', values.googleMapsLink],
    ['address', values.address],
  ];

  for (const [key, value] of optionalEntries) {
    if (value.trim() !== '') {
      payload[key] = value.trim();
    }
  }

  return payload;
};
