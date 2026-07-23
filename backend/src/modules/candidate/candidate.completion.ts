import { CANDIDATE_COMPLETION_WEIGHTS } from '../../config/constants';
import {
  calculateCompletion,
  hasEntries,
  isFilled,
  type CompletionRule,
  type ProfileCompletion,
} from '../../common/utils/completion';
import type { ICompletionCalculator } from '../profile/profile.interface';
import type { CandidateProfile } from './candidate.interface';

export interface CandidateSectionCounts {
  readonly experience: number;
  readonly education: number;
  readonly project: number;
  readonly certification: number;
}

export interface CandidateCompletionSubject {
  readonly profile: CandidateProfile;
  readonly counts: CandidateSectionCounts;
}

const RULES: readonly CompletionRule<CandidateCompletionSubject>[] = [
  {
    key: 'name',
    label: 'Your name',
    weight: CANDIDATE_COMPLETION_WEIGHTS.name,
    isComplete: ({ profile }) => isFilled(profile.firstName) && isFilled(profile.lastName),
  },
  {
    key: 'profilePic',
    label: 'Profile photo',
    weight: CANDIDATE_COMPLETION_WEIGHTS.profilePic,
    isComplete: ({ profile }) => isFilled(profile.profilePicFileId),
  },
  {
    key: 'mobile',
    label: 'Mobile number',
    weight: CANDIDATE_COMPLETION_WEIGHTS.mobile,
    isComplete: ({ profile }) => isFilled(profile.mobile?.number),
  },
  {
    key: 'gender',
    label: 'Gender',
    weight: CANDIDATE_COMPLETION_WEIGHTS.gender,
    isComplete: ({ profile }) => isFilled(profile.gender),
  },
  {
    key: 'dob',
    label: 'Date of birth',
    weight: CANDIDATE_COMPLETION_WEIGHTS.dob,
    isComplete: ({ profile }) => isFilled(profile.dob),
  },
  {
    key: 'currentLocation',
    label: 'Current location',
    weight: CANDIDATE_COMPLETION_WEIGHTS.currentLocation,
    isComplete: ({ profile }) => isFilled(profile.currentLocation),
  },
  {
    key: 'preferredLocations',
    label: 'Preferred locations',
    weight: CANDIDATE_COMPLETION_WEIGHTS.preferredLocations,
    isComplete: ({ profile }) => hasEntries(profile.preferredLocations),
  },
  {
    key: 'skills',
    label: 'Skills',
    weight: CANDIDATE_COMPLETION_WEIGHTS.skills,
    isComplete: ({ profile }) => hasEntries(profile.skills),
  },
  {
    key: 'jobTypes',
    label: 'Preferred job types',
    weight: CANDIDATE_COMPLETION_WEIGHTS.jobTypes,
    isComplete: ({ profile }) => hasEntries(profile.jobTypes),
  },
  {
    key: 'expectedCtc',
    label: 'Expected salary',
    weight: CANDIDATE_COMPLETION_WEIGHTS.expectedCtc,
    isComplete: ({ profile }) => isFilled(profile.expectedCtc),
  },
  {
    key: 'resume',
    label: 'Resume',
    weight: CANDIDATE_COMPLETION_WEIGHTS.resume,
    isComplete: ({ profile }) => isFilled(profile.resumeFileId),
  },
  {
    key: 'experience',
    label: 'Work experience',
    weight: CANDIDATE_COMPLETION_WEIGHTS.experience,
    isComplete: ({ counts }) => counts.experience > 0,
  },
  {
    key: 'education',
    label: 'Education',
    weight: CANDIDATE_COMPLETION_WEIGHTS.education,
    isComplete: ({ counts }) => counts.education > 0,
  },
  {
    key: 'project',
    label: 'Projects',
    weight: CANDIDATE_COMPLETION_WEIGHTS.project,
    isComplete: ({ counts }) => counts.project > 0,
  },
  {
    key: 'certification',
    label: 'Certifications',
    weight: CANDIDATE_COMPLETION_WEIGHTS.certification,
    isComplete: ({ counts }) => counts.certification > 0,
  },
];

export class CandidateCompletionCalculator
  implements ICompletionCalculator<CandidateCompletionSubject>
{
  calculate(subject: CandidateCompletionSubject): ProfileCompletion {
    return calculateCompletion(RULES, subject);
  }
}
