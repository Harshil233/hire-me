import type { Company } from '../company/company.interface';
import { toCompanyResponse } from '../company/company.mapper';
import type { HrProfile } from './hr.interface';
import type { HrProfileResponse } from './hr.schema';

export const toHrProfileResponse = (
  profile: HrProfile,
  company: Company | null,
): HrProfileResponse => ({
  id: profile.id,
  userId: profile.userId,
  firstName: profile.firstName,
  middleName: profile.middleName,
  lastName: profile.lastName,
  designation: profile.designation,
  profilePicFileId: profile.profilePicFileId,
  mobile: profile.mobile,
  gender: profile.gender,
  dob: profile.dob?.toISOString(),
  companyRole: profile.companyRole,
  company: company === null ? null : toCompanyResponse(company),
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});
