import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FilterRail } from '../FilterRail';

describe('FilterRail', () => {
  it('names itself for assistive technology', () => {
    render(
      <FilterRail activeFilterCount={0} onClear={vi.fn()}>
        <p>fields</p>
      </FilterRail>,
    );

    expect(screen.getByRole('complementary', { name: 'Filters' })).toBeInTheDocument();
  });

  it('renders the fields it is given', () => {
    render(
      <FilterRail activeFilterCount={0} onClear={vi.fn()}>
        <p>fields</p>
      </FilterRail>,
    );

    expect(screen.getByText('fields')).toBeInTheDocument();
  });

  it('offers no way to clear when nothing is applied', () => {
    render(
      <FilterRail activeFilterCount={0} onClear={vi.fn()}>
        <p>fields</p>
      </FilterRail>,
    );

    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('clears everything once something is applied', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <FilterRail activeFilterCount={2} onClear={onClear}>
        <p>fields</p>
      </FilterRail>,
    );
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});
