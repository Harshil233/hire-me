import { HR_COMPLETION_WEIGHTS } from '../../config/constants';
import {
  calculateCompletion,
  isFilled,
  type CompletionRule,
  type ProfileCompletion,
} from '../../common/utils/completion';
import type { Company } from '../company/company.interface';
import type { ICompletionCalculator } from '../profile/profile.interface';
import type { HrProfile } from './hr.interface';

export interface HrCompletionSubject {
  readonly profile: HrProfile;
  readonly company: Company | null;
}

const RULES: readonly CompletionRule<HrCompletionSubject>[] = [
  {
    key: 'name',
    label: 'Your name',
    weight: HR_COMPLETION_WEIGHTS.name,
    isComplete: ({ profile }) => isFilled(profile.firstName) && isFilled(profile.lastName),
  },
  {
    key: 'profilePic',
    label: 'Profile photo',
    weight: HR_COMPLETION_WEIGHTS.profilePic,
    isComplete: ({ profile }) => isFilled(profile.profilePicFileId),
  },
  {
    key: 'designation',
    label: 'Your designation',
    weight: HR_COMPLETION_WEIGHTS.designation,
    isComplete: ({ profile }) => isFilled(profile.designation),
  },
  {
    key: 'mobile',
    label: 'Mobile number',
    weight: HR_COMPLETION_WEIGHTS.mobile,
    isComplete: ({ profile }) => isFilled(profile.mobile?.number),
  },
  {
    key: 'gender',
    label: 'Gender',
    weight: HR_COMPLETION_WEIGHTS.gender,
    isComplete: ({ profile }) => isFilled(profile.gender),
  },
  {
    key: 'dob',
    label: 'Date of birth',
    weight: HR_COMPLETION_WEIGHTS.dob,
    isComplete: ({ profile }) => isFilled(profile.dob),
  },
  {
    key: 'company',
    label: 'Company',
    weight: HR_COMPLETION_WEIGHTS.company,
    isComplete: ({ company }) => company !== null,
  },
  {
    key: 'companyDescription',
    label: 'Company description',
    weight: HR_COMPLETION_WEIGHTS.companyDescription,
    isComplete: ({ company }) => isFilled(company?.description),
  },
  {
    key: 'companyLogo',
    label: 'Company logo',
    weight: HR_COMPLETION_WEIGHTS.companyLogo,
    isComplete: ({ company }) => isFilled(company?.logoFileId),
  },
  {
    key: 'companyWebsite',
    label: 'Company website',
    weight: HR_COMPLETION_WEIGHTS.companyWebsite,
    isComplete: ({ company }) => isFilled(company?.websiteUrl),
  },
];

export class HrCompletionCalculator implements ICompletionCalculator<HrCompletionSubject> {
  calculate(subject: HrCompletionSubject): ProfileCompletion {
    return calculateCompletion(RULES, subject);
  }
}
