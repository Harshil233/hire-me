import { z } from 'zod';

import { ROLE_VALUES, VALIDATION_LIMITS } from '@/config/constants';
import {
  emailField,
  optionalHostedUrlField,
  optionalTextField,
  optionalUrlField,
  passwordField,
  requiredTextField,
} from '@/lib/validation';

/* -------------------------------------------------------------------------- */
/* Server contract                                                            */
/* -------------------------------------------------------------------------- */

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(ROLE_VALUES),
});
export type SessionUserResponse = z.infer<typeof sessionUserSchema>;

export const authSessionSchema = z.object({
  user: sessionUserSchema,
  accessToken: z.string(),
});
export type AuthSessionResponse = z.infer<typeof authSessionSchema>;

export const meResponseSchema = z.object({ user: sessionUserSchema });

/* -------------------------------------------------------------------------- */
/* Forms                                                                      */
/* -------------------------------------------------------------------------- */

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

const nameFields = {
  firstName: requiredTextField('First name', VALIDATION_LIMITS.NAME_MAX_LENGTH),
  middleName: optionalTextField(VALIDATION_LIMITS.NAME_MAX_LENGTH),
  lastName: requiredTextField('Last name', VALIDATION_LIMITS.NAME_MAX_LENGTH),
};

const credentialFields = {
  email: emailField,
  password: passwordField,
  confirmPassword: z.string().min(1, 'Confirm your password'),
};

const passwordsMustMatch = (
  value: { password: string; confirmPassword: string },
  ctx: z.RefinementCtx,
): void => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
};

export const candidateRegisterFormSchema = z
  .object({ ...credentialFields, ...nameFields })
  .superRefine(passwordsMustMatch);
export type CandidateRegisterFormValues = z.infer<typeof candidateRegisterFormSchema>;

export const hrRegisterFormSchema = z
  .object({
    ...credentialFields,
    ...nameFields,
    designation: optionalTextField(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
    companyName: requiredTextField('Company name'),
    companyDomain: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value),
        'Enter a domain such as acme.com',
      ),
    companyHeadquarters: optionalTextField(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
    companyWebsiteUrl: optionalUrlField('website'),
    companyLinkedinUrl: optionalHostedUrlField(['linkedin.com'], 'LinkedIn'),
  })
  .superRefine(passwordsMustMatch);
export type HrRegisterFormValues = z.infer<typeof hrRegisterFormSchema>;
