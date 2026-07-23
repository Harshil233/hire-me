import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('names the screen', () => {
    render(<PageHeader title="Find candidates" />);

    expect(screen.getByRole('heading', { name: 'Find candidates' })).toBeInTheDocument();
  });

  it('shows the count only once it is known', () => {
    const { rerender } = render(<PageHeader title="Open roles" />);

    expect(screen.queryByText('12 roles')).not.toBeInTheDocument();

    rerender(<PageHeader title="Open roles" count="12 roles" />);

    expect(screen.getByText('12 roles')).toBeInTheDocument();
  });

  it('renders a description and an action when given them', () => {
    render(
      <PageHeader
        title="Postings"
        description="Drafts stay private."
        action={<button type="button">Post a job</button>}
      />,
    );

    expect(screen.getByText('Drafts stay private.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post a job' })).toBeInTheDocument();
  });

  it('rules a listing screen in the accent colour by default', () => {
    render(<PageHeader title="Open roles" />);

    expect(screen.getByTestId('page-header-rule')).toHaveClass('bg-accent-line');
  });

  it('rules a people screen in the highlight colour instead', () => {
    render(<PageHeader title="Find candidates" tone="highlight" />);

    expect(screen.getByTestId('page-header-rule')).toHaveClass('bg-highlight-line');
  });
});
