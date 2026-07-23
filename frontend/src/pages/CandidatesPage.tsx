import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { FilterChips } from '@/components/FilterChips';
import { FilterDrawer } from '@/components/FilterDrawer';
import { FilterRail } from '@/components/FilterRail';
import { Pagination } from '@/components/Pagination';
import { SearchBar } from '@/components/SearchBar';
import { Skeleton } from '@/components/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { MailIcon, UsersIcon } from '@/components/icons';
import { JOB_TYPE_LABELS, ROUTES } from '@/config/constants';
import { CandidateCard } from '@/features/candidates/components/CandidateCard';
import { CandidateFilterFields } from '@/features/candidates/components/CandidateFilterFields';
import { useCandidates } from '@/features/candidates/hooks/useCandidates';
import type { CandidateFilters } from '@/features/candidates/schemas/candidate.schema';
import { useMyJobs } from '@/features/jobs/hooks/useJobs';
import { ComposeCampaignModal } from '@/features/outreach/components/ComposeCampaignModal';
import { useSendCampaign } from '@/features/outreach/hooks/useOutreach';
import type { CampaignAudience } from '@/features/outreach/schemas/outreach.schema';
import { useFilterParams } from '@/hooks/useFilterParams';
import { useIsWideScreen } from '@/hooks/useMediaQuery';

const FILTER_KEYS = ['search', 'skills', 'location', 'jobType'] as const;

const chipLabel = (key: string, value: string): string => {
  if (key === 'jobType') return JOB_TYPE_LABELS[value as keyof typeof JOB_TYPE_LABELS];
  return value;
};

/** The employer's landing screen: people first, rather than a list of their own adverts. */
export const CandidatesPage = (): React.JSX.Element => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isWide = useIsWideScreen();

  const { filters, activeCount, chips, apply, search, remove, clear, goToPage } =
    useFilterParams<CandidateFilters>(FILTER_KEYS, chipLabel);
  const query = useCandidates(filters);

  // Outreach selection. `null` means "everyone the current search matches".
  const [picked, setPicked] = useState<readonly string[] | null>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const send = useSendCampaign();

  // Only your own published listings: the server refuses anything else, and offering
  // another company's job would be a dead end.
  const myJobs = useMyJobs({ status: 'published' });
  const publishedJobs = useMemo(() => myJobs.data?.jobs ?? [], [myJobs.data]);

  const audience: CampaignAudience =
    picked === null
      ? { kind: 'filter', filter: filters as Record<string, string | undefined> }
      : { kind: 'selection', candidateUserIds: picked };

  const selectedCount = picked === null ? (query.data?.pagination.total ?? 0) : picked.length;

  const toggle = (userId: string): void => {
    setPicked((current) => {
      const list = current ?? [];
      return list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId];
    });
  };

  const fields = <CandidateFilterFields value={filters} onChange={apply} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find candidates"
        tone="highlight"
        count={
          query.isSuccess
            ? `${String(query.data.pagination.total)} ${query.data.pagination.total === 1 ? 'person' : 'people'}`
            : undefined
        }
        action={
          <Link to={ROUTES.HR_JOBS}>
            <Button variant="secondary">Your postings</Button>
          </Link>
        }
      />

      <div className="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-6">
        {/* Beside the results when there is room; behind a button when there is not. */}
        {isWide && (
          <FilterRail activeFilterCount={activeCount} onClear={clear}>
            {fields}
          </FilterRail>
        )}

        <div className="space-y-4">
          <SearchBar
            value={filters.search ?? ''}
            placeholder="Search by name, skill or location"
            activeFilterCount={activeCount}
            showFilterButton={!isWide}
            onSearch={search}
            onOpenFilters={() => {
              setIsFilterOpen(true);
            }}
          />

          {/* The rail already shows what is applied, with its own way to clear it. */}
          {!isWide && <FilterChips chips={chips} onRemove={remove} onClearAll={clear} />}

          {query.isSuccess && query.data.pagination.total > 0 && (
            <div className="surface-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium text-fg" data-testid="selected-count">
                  {selectedCount} selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                  }}
                  className="text-sm font-medium text-highlight-text transition hover:underline"
                >
                  Select all {query.data.pagination.total} matching
                </button>
                {picked !== null && picked.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPicked([]);
                    }}
                    className="text-sm text-fg-muted transition hover:text-fg"
                  >
                    Clear
                  </button>
                )}
              </div>

              <Button
                size="sm"
                leadingIcon={<MailIcon className="h-4 w-4" />}
                disabled={selectedCount === 0}
                onClick={() => {
                  send.reset();
                  setIsComposeOpen(true);
                }}
              >
                Email {selectedCount === 1 ? 'them' : 'these candidates'}
              </Button>
            </div>
          )}

          {query.isPending && (
            <div className="grid gap-3" data-testid="candidates-loading">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          )}

          {query.isError && <Alert tone="error">{query.error.message}</Alert>}

          {query.isSuccess && query.data.candidates.length === 0 && (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title="Nobody matches these filters"
              description="Try a broader search, or clear a filter to widen the pool."
            />
          )}

          {query.isSuccess && query.data.candidates.length > 0 && (
            <div className="grid items-start gap-3 xl:grid-cols-2">
              {query.data.candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.userId}
                  candidate={candidate}
                  selection={
                    <input
                      type="checkbox"
                      aria-label={`Select ${candidate.fullName}`}
                      checked={picked === null || picked.includes(candidate.userId)}
                      onChange={() => {
                        toggle(candidate.userId);
                      }}
                      className="h-4 w-4 cursor-pointer accent-[var(--highlight)]"
                    />
                  }
                />
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
      </div>

      {isComposeOpen && (
        <ComposeCampaignModal
          isOpen={isComposeOpen}
          audience={audience}
          jobs={publishedJobs}
          isSending={send.isPending}
          error={send.error}
          onClose={() => {
            setIsComposeOpen(false);
          }}
          onSend={(draft) => {
            send.mutate(draft, {
              onSuccess: () => {
                setIsComposeOpen(false);
                setPicked([]);
              },
            });
          }}
        />
      )}

      {!isWide && (
        <FilterDrawer
          isOpen={isFilterOpen}
          activeFilterCount={activeCount}
          onClose={() => {
            setIsFilterOpen(false);
          }}
          onClear={clear}
        >
          {fields}
        </FilterDrawer>
      )}
    </div>
  );
};
