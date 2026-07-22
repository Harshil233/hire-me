import { z } from 'zod';

import { ROLE_VALUES, VALIDATION_LIMITS } from '../../config/constants';
import {
  emailSchema,
  optionalField,
  passwordSchema,
  requiredName,
} from '../../common/validation/fields';
import { createCompanySchema } from '../company/company.schema';

/** Fields both roles supply at sign-up. Everything else is filled in on the profile page. */
const baseRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: requiredName('First name'),
  middleName: optionalField(requiredName('Middle name')),
  lastName: requiredName('Last name'),
});

export const registerCandidateSchema = baseRegisterSchema;
export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>;

export const registerHrSchema = baseRegisterSchema.extend({
  designation: optionalField(
    z.string().trim().min(1).max(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
  ),
  /** The company is created together with the HR account, in one transaction. */
  company: createCompanySchema,
});
export type RegisterHrInput = z.infer<typeof registerHrSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately not `passwordSchema`: the login form must not disclose the policy,
  // and existing passwords are checked against the stored hash, not against rules.
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

const authUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(ROLE_VALUES),
});

export const authSessionResponseSchema = z.object({
  user: authUserResponseSchema,
  accessToken: z.string(),
});
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
