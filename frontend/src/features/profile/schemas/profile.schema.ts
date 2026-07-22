import { z } from 'zod';

import { GENDER_VALUES, JOB_TYPE_VALUES, ROLES, VALIDATION_LIMITS } from '@/config/constants';
import {
  chipsField,
  countryCodeField,
  mobileNumberField,
  optionalAmountField,
  optionalDobField,
  optionalHostedUrlField,
  optionalTextField,
  optionalUrlField,
  requiredTextField,
} from '@/lib/validation';

/* -------------------------------------------------------------------------- */
/* Server contract                                                            */
/* -------------------------------------------------------------------------- */

const completionItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  weight: z.number(),
  isComplete: z.boolean(),
});

export const completionSchema = z.object({
  percentage: z.number(),
  completedWeight: z.number(),
  totalWeight: z.number(),
  items: z.array(completionItemSchema),
  missing: z.array(completionItemSchema),
});
export type ProfileCompletion = z.infer<typeof completionSchema>;

export const mobileSchema = z.object({ countryCode: z.string(), number: z.string() });

export const candidateProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  middleName: z.string().optional(),
  lastName: z.string(),
  profilePicFileId: z.string().optional(),
  mobile: mobileSchema.optional(),
  gender: z.enum(GENDER_VALUES).optional(),
  dob: z.string().optional(),
  currentLocation: z.string().optional(),
  preferredLocations: z.array(z.string()),
  skills: z.array(z.string()),
  jobTypes: z.array(z.enum(JOB_TYPE_VALUES)),
  currentCtc: z.number().optional(),
  expectedCtc: z.number().optional(),
  currency: z.string(),
  resumeFileId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  locations: z.array(z.string()),
  headquarters: z.string().optional(),
  domain: z.string().optional(),
  logoFileId: z.string().optional(),
  websiteUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  googleMapsLink: z.string().optional(),
  address: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Company = z.infer<typeof companySchema>;

export const hrProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  middleName: z.string().optional(),
  lastName: z.string(),
  designation: z.string().optional(),
  profilePicFileId: z.string().optional(),
  mobile: mobileSchema.optional(),
  gender: z.enum(GENDER_VALUES).optional(),
  dob: z.string().optional(),
  companyRole: z.enum(['owner', 'member']),
  company: companySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HrProfile = z.infer<typeof hrProfileSchema>;

/** Discriminated on `role`, so components narrow without casts. */
export const profileViewSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal(ROLES.CANDIDATE),
    profile: candidateProfileSchema,
    completion: completionSchema,
  }),
  z.object({
    role: z.literal(ROLES.HR),
    profile: hrProfileSchema,
    completion: completionSchema,
  }),
]);
export type ProfileView = z.infer<typeof profileViewSchema>;

export const uploadedFileSchema = z.object({
  file: z.object({
    id: z.string(),
    kind: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    createdAt: z.string(),
  }),
});

export const companyResponseSchema = z.object({ company: companySchema });

/* -------------------------------------------------------------------------- */
/* Forms                                                                      */
/* -------------------------------------------------------------------------- */

const nameFields = {
  firstName: requiredTextField('First name', VALIDATION_LIMITS.NAME_MAX_LENGTH),
  middleName: optionalTextField(VALIDATION_LIMITS.NAME_MAX_LENGTH),
  lastName: requiredTextField('Last name', VALIDATION_LIMITS.NAME_MAX_LENGTH),
};

const contactFields = {
  gender: z.union([z.enum(GENDER_VALUES), z.literal('')]),
  dob: optionalDobField(),
  countryCode: z.union([countryCodeField, z.literal('')]),
  mobileNumber: z.union([mobileNumberField, z.literal('')]),
};

/** A mobile number is only meaningful with its country code, and vice versa. */
const mobilePairRule = (
  value: { countryCode: string; mobileNumber: string },
  ctx: z.RefinementCtx,
): void => {
  if (value.mobileNumber !== '' && value.countryCode === '') {
    ctx.addIssue({ code: 'custom', path: ['countryCode'], message: 'Add the country code' });
  }
  if (value.countryCode !== '' && value.mobileNumber === '') {
    ctx.addIssue({ code: 'custom', path: ['mobileNumber'], message: 'Add the mobile number' });
  }
};

export const candidatePersonalFormSchema = z
  .object({
    ...nameFields,
    ...contactFields,
    currentLocation: optionalTextField(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
  })
  .superRefine(mobilePairRule);
export type CandidatePersonalFormValues = z.infer<typeof candidatePersonalFormSchema>;

export const hrPersonalFormSchema = z
  .object({
    ...nameFields,
    ...contactFields,
    designation: optionalTextField(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
  })
  .superRefine(mobilePairRule);
export type HrPersonalFormValues = z.infer<typeof hrPersonalFormSchema>;

export const jobPreferencesFormSchema = z
  .object({
    preferredLocations: chipsField('Preferred locations'),
    skills: chipsField('Skills'),
    jobTypes: z.array(z.enum(JOB_TYPE_VALUES)),
    currentCtc: optionalAmountField,
    expectedCtc: optionalAmountField,
  })
  .superRefine((value, ctx) => {
    if (
      value.currentCtc !== '' &&
      value.expectedCtc !== '' &&
      Number(value.expectedCtc) < Number(value.currentCtc)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['expectedCtc'],
        message: 'Expected salary is lower than your current one — is that intended?',
      });
    }
  });
export type JobPreferencesFormValues = z.infer<typeof jobPreferencesFormSchema>;

export const companyFormSchema = z.object({
  name: requiredTextField('Company name'),
  description: optionalTextField(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
  headquarters: optionalTextField(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
  locations: chipsField('Locations'),
  domain: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value),
      'Enter a domain such as acme.com',
    ),
  websiteUrl: optionalUrlField('website'),
  linkedinUrl: optionalHostedUrlField(['linkedin.com'], 'LinkedIn'),
  facebookUrl: optionalHostedUrlField(['facebook.com', 'fb.com'], 'Facebook'),
  instagramUrl: optionalHostedUrlField(['instagram.com'], 'Instagram'),
  googleMapsLink: optionalHostedUrlField(
    ['google.com', 'goo.gl', 'maps.app.goo.gl'],
    'Google Maps',
  ),
  address: optionalTextField(VALIDATION_LIMITS.ADDRESS_MAX_LENGTH),
});
export type CompanyFormValues = z.infer<typeof companyFormSchema>;
