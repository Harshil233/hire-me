import { ROLES, type Role } from '@/config/constants';

/**
 * The two audiences, labelled once and shared by the sign-in and sign-up screens so the
 * wording and the markup cannot drift apart (CLAUDE.md §9).
 */
const ROLE_TABS: readonly { role: Role; label: string }[] = [
  { role: ROLES.CANDIDATE, label: "I'm looking for a job" },
  { role: ROLES.HR, label: "I'm hiring" },
];

export interface RoleTabsProps {
  readonly value: Role;
  readonly onChange: (role: Role) => void;
  /** Names the tablist for assistive technology. */
  readonly label: string;
}

export const RoleTabs = ({ value, onChange, label }: RoleTabsProps): React.JSX.Element => (
  <div role="tablist" aria-label={label} className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1">
    {ROLE_TABS.map((tab) => (
      <button
        key={tab.role}
        type="button"
        role="tab"
        aria-selected={value === tab.role}
        onClick={() => {
          onChange(tab.role);
        }}
        className={
          value === tab.role
            ? 'flex-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm'
            : 'flex-1 rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800'
        }
      >
        {tab.label}
      </button>
    ))}
  </div>
);
