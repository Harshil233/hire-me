import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SkillFilter } from '../components/SkillFilter';

const FEW = ['React', 'Node.js', 'SQL'];
const MANY = [
  'React',
  'Node.js',
  'SQL',
  'Python',
  'Figma',
  'AWS',
  'Docker',
  'Kubernetes',
  'Terraform',
];

describe('SkillFilter', () => {
  it('offers every skill it is given', () => {
    render(<SkillFilter skills={FEW} value={undefined} onToggle={vi.fn()} />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(FEW.length);
  });

  it('ticks the skills already in the selection', () => {
    render(<SkillFilter skills={FEW} value="React" onToggle={vi.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'React' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'SQL' })).not.toBeChecked();
  });

  it('ticks a selection that was stored in a different case', () => {
    render(<SkillFilter skills={FEW} value="react" onToggle={vi.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'React' })).toBeChecked();
  });

  it('reports the skill that was clicked', async () => {
    const onToggle = vi.fn();
    render(<SkillFilter skills={FEW} value={undefined} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'SQL' }));

    expect(onToggle).toHaveBeenCalledWith('SQL');
  });

  it('counts the selection beside the heading', () => {
    render(<SkillFilter skills={FEW} value="React,SQL" onToggle={vi.fn()} />);

    expect(screen.getByRole('group', { name: /Skills/ })).toHaveTextContent('(2)');
  });

  it('leaves the count off when nothing is selected', () => {
    render(<SkillFilter skills={FEW} value={undefined} onToggle={vi.fn()} />);

    expect(screen.getByRole('group', { name: /Skills/ })).not.toHaveTextContent('(');
  });

  it('stays a plain list while it is short enough to read', () => {
    render(<SkillFilter skills={FEW} value={undefined} onToggle={vi.fn()} />);

    expect(screen.queryByLabelText('Filter the skill list')).not.toBeInTheDocument();
  });

  it('grows a search box once the list is long', () => {
    render(<SkillFilter skills={MANY} value={undefined} onToggle={vi.fn()} />);

    expect(screen.getByLabelText('Filter the skill list')).toBeInTheDocument();
  });

  it('narrows the list as the search box is typed into', async () => {
    render(<SkillFilter skills={MANY} value={undefined} onToggle={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Filter the skill list'), 'ku');

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'Kubernetes' })).toBeInTheDocument();
  });

  it('keeps a selected skill visible even when the search excludes it', async () => {
    render(<SkillFilter skills={MANY} value="React" onToggle={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Filter the skill list'), 'figma');

    expect(screen.getByRole('checkbox', { name: 'React' })).toBeInTheDocument();
  });

  it('floats the selection to the top so it never scrolls out of sight', () => {
    render(<SkillFilter skills={MANY} value="Terraform" onToggle={vi.fn()} />);

    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName('Terraform');
  });

  it('says so when the search matches nothing', async () => {
    render(<SkillFilter skills={MANY} value={undefined} onToggle={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Filter the skill list'), 'cobol');

    expect(screen.getByText(/No skill matches/)).toBeInTheDocument();
  });
});
