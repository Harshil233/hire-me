import type { HrProfile, ProfileCompletion } from '../schemas/profile.schema';
import { CompanyCard } from './CompanyCard';
import { HrPersonalCard } from './HrPersonalCard';
import { ProfileHeader } from './ProfileHeader';

export interface HrProfileViewProps {
  readonly profile: HrProfile;
  readonly completion: ProfileCompletion;
  readonly email: string;
}

export const HrProfileView = ({
  profile,
  completion,
  email,
}: HrProfileViewProps): React.JSX.Element => (
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

    <HrPersonalCard profile={profile} />
    <CompanyCard company={profile.company} canManage={profile.companyRole === 'owner'} />
  </div>
);
