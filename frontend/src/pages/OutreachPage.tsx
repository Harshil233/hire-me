import { Link } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { MailIcon } from '@/components/icons';
import { ROUTES } from '@/config/constants';
import { CampaignRow } from '@/features/outreach/components/CampaignRow';
import { useCampaigns } from '@/features/outreach/hooks/useOutreach';
import { useFilterParams } from '@/hooks/useFilterParams';

const FILTER_KEYS: readonly string[] = [];

/** What has been sent, and how it went. Counts move on their own while a send is running. */
export const OutreachPage = (): React.JSX.Element => {
  const { filters, goToPage } = useFilterParams<{ page?: number | undefined }>(
    FILTER_KEYS,
    (_key, value) => value,
  );
  const query = useCampaigns(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email campaigns"
        tone="highlight"
        count={
          query.isSuccess
            ? `${String(query.data.pagination.total)} sent`
            : undefined
        }
        description="Invitations you have sent to candidates from the talent pool."
        action={
          <Link to={ROUTES.CANDIDATES}>
            <Button variant="secondary">Find candidates</Button>
          </Link>
        }
      />

      {query.isPending && (
        <div className="grid gap-3" data-testid="campaigns-loading">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {query.isError && <Alert tone="error">{query.error.message}</Alert>}

      {query.isSuccess && query.data.campaigns.length === 0 && (
        <EmptyState
          icon={<MailIcon className="h-6 w-6" />}
          title="No campaigns yet"
          description="Search the talent pool, tick the people who fit, and invite them to one of your live listings."
          action={
            <Link to={ROUTES.CANDIDATES}>
              <Button>Find candidates</Button>
            </Link>
          }
        />
      )}

      {query.isSuccess && query.data.campaigns.length > 0 && (
        <div className="grid gap-3">
          {query.data.campaigns.map((campaign) => (
            <CampaignRow key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {query.isSuccess && (
        <Pagination
          page={query.data.pagination.page}
          totalPages={query.data.pagination.totalPages}
          total={query.data.pagination.total}
          onChange={goToPage}
        />
      )}
    </div>
  );
};
