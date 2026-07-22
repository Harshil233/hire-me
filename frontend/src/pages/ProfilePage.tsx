import { Alert } from '@/components/Alert';
import { Spinner } from '@/components/Spinner';
import { ROLES } from '@/config/constants';
import { CandidateProfileView } from '@/features/profile/components/CandidateProfileView';
import { HrProfileView } from '@/features/profile/components/HrProfileView';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useAuthStore } from '@/store/auth.store';

/** Route-level screen: fetches once, then dispatches on the role in the payload. */
export const ProfilePage = (): React.JSX.Element => {
  const profileQuery = useProfile();
  const email = useAuthStore((state) => state.user?.email ?? '');

  if (profileQuery.isPending) {
    return (
      <div className="flex justify-center py-24 text-brand-600">
        <Spinner size="lg" label="Loading your profile" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <Alert tone="error" title="We could not load your profile">
        {profileQuery.error.message}
      </Alert>
    );
  }

  const view = profileQuery.data;

  return view.role === ROLES.CANDIDATE ? (
    <CandidateProfileView profile={view.profile} completion={view.completion} email={email} />
  ) : (
    <HrProfileView profile={view.profile} completion={view.completion} email={email} />
  );
};
