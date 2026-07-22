import { z } from 'zod';

import { VALIDATION_LIMITS } from '../../config/constants';
import {
  hostedUrlSchema,
  objectIdSchema,
  optionalField,
  requiredText,
  stringListSchema,
  urlSchema,
} from '../../common/validation/fields';

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'Enter a valid domain such as acme.com');

/**
 * Field rules declared once. Note that no field carries a default here: a default on
 * the update schema would turn an empty `PUT` into a silent wipe of that field.
 */
const companyFields = {
  name: requiredText('Company name'),
  description: optionalField(z.string().trim().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)),
  locations: stringListSchema('Locations'),
  headquarters: optionalField(requiredText('Headquarters')),
  domain: optionalField(domainSchema),
  logoFileId: optionalField(objectIdSchema),
  websiteUrl: optionalField(urlSchema),
  linkedinUrl: optionalField(hostedUrlSchema(['linkedin.com'], 'LinkedIn')),
  facebookUrl: optionalField(hostedUrlSchema(['facebook.com', 'fb.com'], 'Facebook')),
  instagramUrl: optionalField(hostedUrlSchema(['instagram.com'], 'Instagram')),
  googleMapsLink: optionalField(
    hostedUrlSchema(['google.com', 'goo.gl', 'maps.app.goo.gl'], 'Google Maps'),
  ),
  address: optionalField(z.string().trim().max(VALIDATION_LIMITS.ADDRESS_MAX_LENGTH)),
};

/** Shared by `POST /company/register` and the company block of `POST /hr/register`. */
export const createCompanySchema = z.object({
  ...companyFields,
  locations: stringListSchema('Locations').default([]),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z
  .object(companyFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const companyIdParamsSchema = z.object({ id: objectIdSchema });
export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

/** Response contract — also mirrored by the frontend schema. */
export const companyResponseSchema = z.object({
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
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type CompanyResponse = z.infer<typeof companyResponseSchema>;
