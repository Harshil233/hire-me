import { z } from 'zod';

import { VALIDATION_LIMITS } from '../../config/constants';
import {
  createDateRangeRule,
  isoDateSchema,
  optionalField,
  pastDateSchema,
  requiredText,
  urlSchema,
} from '../../common/validation/fields';

const certificationObjectSchema = z.object({
  title: requiredText('Certification title'),
  issuedBy: requiredText('Issuing organisation'),
  issuedOn: pastDateSchema,
  expiresOn: optionalField(isoDateSchema),
  credentialUrl: optionalField(urlSchema),
  description: optionalField(z.string().trim().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)),
});

/** Reuses the shared range rule with this module's date field names. */
export const certificationInputSchema = certificationObjectSchema.superRefine(
  createDateRangeRule({ startField: 'issuedOn', endField: 'expiresOn' }),
);
export type CertificationInput = z.infer<typeof certificationInputSchema>;

export const CERTIFICATION_FIELDS = Object.keys(certificationObjectSchema.shape);

export const certificationResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  issuedBy: z.string(),
  issuedOn: z.iso.datetime(),
  expiresOn: z.iso.datetime().optional(),
  credentialUrl: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type CertificationResponse = z.infer<typeof certificationResponseSchema>;
