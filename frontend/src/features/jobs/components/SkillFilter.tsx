import { useState } from 'react';

import { SearchIcon } from '@/components/icons';
import { parseCsvList } from '@/lib/csv-list';

/** Beyond this many, hunting through the list costs more than typing the skill. */
const TYPEAHEAD_THRESHOLD = 8;

export interface SkillFilterProps {
  /** The vocabulary, most asked-for first. */
  readonly skills: readonly string[];
  /** Comma-separated selection, as it travels in the URL. */
  readonly value: string | undefined;
  readonly onToggle: (skill: string) => void;
}

/**
 * The skills a listing can be narrowed by. Chosen skills float to the top so the current
 * selection never scrolls out of sight, and the list only grows a search box once it is
 * long enough to need one.
 */
export const SkillFilter = ({ skills, value, onToggle }: SkillFilterProps): React.JSX.Element => {
  const [term, setTerm] = useState('');

  const selected = parseCsvList(value).map((skill) => skill.toLowerCase());
  const isSelected = (skill: string): boolean => selected.includes(skill.toLowerCase());

  const matches = skills.filter(
    (skill) => isSelected(skill) || skill.toLowerCase().includes(term.trim().toLowerCase()),
  );
  const ordered = [...matches].sort(
    (left, right) => Number(isSelected(right)) - Number(isSelected(left)),
  );

  return (
    <fieldset>
      <legend className="field-label">
        Skills
        {selected.length > 0 && (
          <span className="numeric ml-1.5 text-fg-subtle">({selected.length})</span>
        )}
      </legend>

      {skills.length > TYPEAHEAD_THRESHOLD && (
        <div className="relative mt-1.5">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={term}
            aria-label="Filter the skill list"
            placeholder="Find a skill"
            onChange={(event) => {
              setTerm(event.target.value);
            }}
            className="field-control py-1.5 pr-2 pl-8 text-xs"
          />
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="mt-2 text-xs text-fg-subtle">No skill matches “{term.trim()}”.</p>
      ) : (
        <ul className="mt-2 max-h-52 space-y-0.5 overflow-y-auto pr-1">
          {ordered.map((skill) => (
            <li key={skill}>
              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-1.5 py-1 text-sm text-fg-muted transition hover:bg-surface-hover hover:text-fg">
                <input
                  type="checkbox"
                  checked={isSelected(skill)}
                  onChange={() => {
                    onToggle(skill);
                  }}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--color-brand)]"
                />
                <span className="truncate">{skill}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
};
