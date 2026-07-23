import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfileQuickLinks } from '../components/ProfileQuickLinks';

const SECTIONS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'resume', label: 'Resume' },
];

describe('ProfileQuickLinks', () => {
  it('names itself for assistive technology', () => {
    render(<ProfileQuickLinks sections={SECTIONS} />);

    expect(screen.getByRole('navigation', { name: 'Profile sections' })).toBeInTheDocument();
  });

  it('links to each section by its anchor', () => {
    render(<ProfileQuickLinks sections={SECTIONS} />);

    expect(screen.getByRole('link', { name: 'Personal details' })).toHaveAttribute(
      'href',
      '#personal',
    );
    expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '#resume');
  });

  it('lists exactly the sections it is given', () => {
    render(<ProfileQuickLinks sections={SECTIONS} />);

    expect(screen.getAllByRole('link')).toHaveLength(SECTIONS.length);
  });
});
