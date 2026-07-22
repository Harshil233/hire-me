import { SectionCard } from '@/features/sections/components/SectionCard';
import { certificationConfig } from '@/features/sections/configs/certification.config';
import { educationConfig } from '@/features/sections/configs/education.config';
import { experienceConfig } from '@/features/sections/configs/experience.config';
import { projectConfig } from '@/features/sections/configs/project.config';
import type { CandidateProfile, ProfileCompletion } from '../schemas/profile.schema';
import { CandidatePersonalCard } from './CandidatePersonalCard';
import { JobPreferencesCard } from './JobPreferencesCard';
import { ProfileHeader } from './ProfileHeader';
import { ResumeCard } from './ResumeCard';

export interface CandidateProfileViewProps {
  readonly profile: CandidateProfile;
  readonly completion: ProfileCompletion;
  readonly email: string;
}

/** Composition only — every piece owns its own state (CLAUDE.md §10). */
export const CandidateProfileView = ({
  profile,
  completion,
  email,
}: CandidateProfileViewProps): React.JSX.Element => (
  <div className="space-y-6">
    <ProfileHeader
      firstName={profile.firstName}
      middleName={profile.middleName}
      lastName={profile.lastName}
      email={email}
      subtitle={profile.currentLocation}
      profilePicFileId={profile.profilePicFileId}
      completion={completion}
    />

    <CandidatePersonalCard profile={profile} />
    <JobPreferencesCard profile={profile} />
    <ResumeCard resumeFileId={profile.resumeFileId} />

    <SectionCard config={experienceConfig} />
    <SectionCard config={educationConfig} />
    <SectionCard config={projectConfig} />
    <SectionCard config={certificationConfig} />
  </div>
);
