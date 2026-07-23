import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CandidateAvatar } from '../components/CandidateAvatar';

describe('CandidateAvatar', () => {
  it('takes the initials from the first and last name', () => {
    render(<CandidateAvatar fullName="Ada Lovelace" />);

    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('ignores middle names rather than running out of room', () => {
    render(<CandidateAvatar fullName="Ada B Lovelace" />);

    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('handles a single-word name', () => {
    render(<CandidateAvatar fullName="Prince" />);

    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('falls back rather than rendering an empty circle', () => {
    render(<CandidateAvatar fullName="" />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('is hidden from assistive technology, being decorative', () => {
    const { container } = render(<CandidateAvatar fullName="Ada Lovelace" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders larger when asked', () => {
    const { container } = render(<CandidateAvatar fullName="Ada Lovelace" size="lg" />);

    expect(container.firstElementChild).toHaveClass('h-16');
  });
});
