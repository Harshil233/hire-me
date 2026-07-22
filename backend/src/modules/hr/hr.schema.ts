import { z } from 'zod';

import { COMPANY_ROLE_VALUES, VALIDATION_LIMITS } from '../../config/constants';
import {
  clearableField,
  dobSchema,
  genderSchema,
  mobileSchema,
  objectIdSchema,
  requiredName,
} from '../../common/validation/fields';
import { companyResponseSchema } from '../company/company.schema';

export const updateHrProfileSchema = z
  .object({
    firstName: requiredName('First name').optional(),
    middleName: clearableField(requiredName('Middle name')),
    lastName: requiredName('Last name').optional(),
    designation: clearableField(
      z.string().trim().min(1).max(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
    ),
    profilePicFileId: clearableField(objectIdSchema),
    mobile: clearableField(mobileSchema),
    gender: clearableField(genderSchema),
    dob: clearableField(dobSchema),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export type UpdateHrProfileInput = z.infer<typeof updateHrProfileSchema>;

export const createHrProfileSchema = z.object({
  firstName: requiredName('First name'),
  middleName: requiredName('Middle name').optional(),
  lastName: requiredName('Last name'),
  designation: z.string().trim().min(1).max(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH).optional(),
});
export type CreateHrProfileInput = z.infer<typeof createHrProfileSchema>;

export const hrProfileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  middleName: z.string().optional(),
  lastName: z.string(),
  designation: z.string().optional(),
  profilePicFileId: z.string().optional(),
  mobile: z.object({ countryCode: z.string(), number: z.string() }).optional(),
  gender: genderSchema.optional(),
  dob: z.iso.datetime().optional(),
  companyRole: z.enum(COMPANY_ROLE_VALUES),
  company: companyResponseSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type HrProfileResponse = z.infer<typeof hrProfileResponseSchema>;
