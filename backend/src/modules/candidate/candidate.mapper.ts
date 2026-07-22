import { CTC_CURRENCY } from '../../config/constants';
import type { CandidateProfile } from './candidate.interface';
import type { CandidateProfileResponse } from './candidate.schema';

export const toCandidateProfileResponse = (
  profile: CandidateProfile,
): CandidateProfileResponse => ({
  id: profile.id,
  userId: profile.userId,
  firstName: profile.firstName,
  middleName: profile.middleName,
  lastName: profile.lastName,
  profilePicFileId: profile.profilePicFileId,
  mobile: profile.mobile,
  gender: profile.gender,
  dob: profile.dob?.toISOString(),
  currentLocation: profile.currentLocation,
  preferredLocations: [...profile.preferredLocations],
  skills: [...profile.skills],
  jobTypes: [...profile.jobTypes],
  currentCtc: profile.currentCtc,
  expectedCtc: profile.expectedCtc,
  currency: CTC_CURRENCY,
  resumeFileId: profile.resumeFileId,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});
