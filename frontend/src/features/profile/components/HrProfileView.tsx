import type { ReactNode } from 'react';

import { useIsWideScreen } from '@/hooks/useMediaQuery';
import type { HrProfile, ProfileCompletion } from '../schemas/profile.schema';
import { CompanyCard } from './CompanyCard';
import { HrPersonalCard } from './HrPersonalCard';
import { ProfileHeader } from './ProfileHeader';
import { ProfileQuickLinks } from './ProfileQuickLinks';

export interface HrProfileViewProps {
  readonly profile: HrProfile;
  readonly completion: ProfileCompletion;
  readonly email: string;
}

const Section = ({ id, children }: { id: string; children: ReactNode }): React.JSX.Element => (
  <div id={id} className="scroll-mt-24">
    {children}
  </div>
);

const SECTIONS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'company', label: 'Company' },
];

export const HrProfileView = ({
  profile,
  completion,
  email,
}: HrProfileViewProps): React.JSX.Element => {
  const isWide = useIsWideScreen();

  return (
    <div className="space-y-6">
      <ProfileHeader
        firstName={profile.firstName}
        middleName={profile.middleName}
        lastName={profile.lastName}
        email={email}
        subtitle={profile.designation ?? profile.company?.name}
        profilePicFileId={profile.profilePicFileId}
        completion={completion}
      />

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
        {isWide && <ProfileQuickLinks sections={SECTIONS} />}

        <div className="space-y-5">
          <Section id="personal">
            <HrPersonalCard profile={profile} />
          </Section>
          <Section id="company">
            <CompanyCard company={profile.company} canManage={profile.companyRole === 'owner'} />
          </Section>
        </div>
      </div>
    </div>
  );
};
