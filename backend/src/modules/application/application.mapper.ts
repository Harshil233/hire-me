import { toJobResponse } from '../job/job.mapper';
import type {
  Application,
  ApplicationWithCandidate,
  ApplicationWithJob,
} from './application.interface';
import type { ApplicantResponse, MyApplicationResponse } from './application.schema';

/** Fields both views share. Domain → HTTP happens here only. */
const toBase = (
  application: Application,
): Omit<MyApplicationResponse, 'job'> & Omit<ApplicantResponse, 'candidate'> => ({
  id: application.id,
  status: application.status,
  coverNote: application.coverNote,
  resumeFileId: application.resumeFileId,
  statusUpdatedAt: application.statusUpdatedAt.toISOString(),
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString(),
});

/** The candidate's view: their application and the listing it was for. */
export const toMyApplicationResponse = (
  application: ApplicationWithJob,
): MyApplicationResponse => ({
  ...toBase(application),
  job: toJobResponse(application.job),
});

/** The employer's view: the application and who sent it. */
export const toApplicantResponse = (
  application: ApplicationWithCandidate,
): ApplicantResponse => ({
  ...toBase(application),
  candidate: {
    userId: application.candidate.userId,
    fullName: application.candidate.fullName,
    currentLocation: application.candidate.currentLocation,
    skills: [...application.candidate.skills],
    profilePicFileId: application.candidate.profilePicFileId,
  },
});
