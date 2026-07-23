import type { ReactNode } from 'react';

import { useIsWideScreen } from '@/hooks/useMediaQuery';
import { SectionCard } from '@/features/sections/components/SectionCard';
import { certificationConfig } from '@/features/sections/configs/certification.config';
import { educationConfig } from '@/features/sections/configs/education.config';
import { experienceConfig } from '@/features/sections/configs/experience.config';
import { projectConfig } from '@/features/sections/configs/project.config';
import type { CandidateProfile, ProfileCompletion } from '../schemas/profile.schema';
import { CandidatePersonalCard } from './CandidatePersonalCard';
import { JobPreferencesCard } from './JobPreferencesCard';
import { ProfileHeader } from './ProfileHeader';
import { ProfileQuickLinks } from './ProfileQuickLinks';
import { ResumeCard } from './ResumeCard';

export interface CandidateProfileViewProps {
  readonly profile: CandidateProfile;
  readonly completion: ProfileCompletion;
  readonly email: string;
}

/** Anchors for the contents list; `scroll-mt` clears the sticky header on arrival. */
const Section = ({ id, children }: { id: string; children: ReactNode }): React.JSX.Element => (
  <div id={id} className="scroll-mt-24">
    {children}
  </div>
);

const SECTIONS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'preferences', label: 'Job preferences' },
  { id: 'resume', label: 'Résumé' },
  { id: 'experience', label: 'Work experience' },
  { id: 'education', label: 'Education' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
];

/** Composition only — every piece owns its own state (CLAUDE.md §10). */
export const CandidateProfileView = ({
  profile,
  completion,
  email,
}: CandidateProfileViewProps): React.JSX.Element => {
  const isWide = useIsWideScreen();

  return (
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

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
        {/* A profile is long and edited a section at a time; the rail keeps it navigable. */}
        {isWide && <ProfileQuickLinks sections={SECTIONS} />}

        <div className="space-y-5">
          <Section id="personal">
            <CandidatePersonalCard profile={profile} />
          </Section>
          <Section id="preferences">
            <JobPreferencesCard profile={profile} />
          </Section>
          <Section id="resume">
            <ResumeCard resumeFileId={profile.resumeFileId} />
          </Section>
          <Section id="experience">
            <SectionCard config={experienceConfig} />
          </Section>
          <Section id="education">
            <SectionCard config={educationConfig} />
          </Section>
          <Section id="projects">
            <SectionCard config={projectConfig} />
          </Section>
          <Section id="certifications">
            <SectionCard config={certificationConfig} />
          </Section>
        </div>
      </div>
    </div>
  );
};
