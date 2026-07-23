import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProfileQuickLinks } from '../components/ProfileQuickLinks';
import {
  installIntersectionObserver,
  type FakeIntersectionObserver,
} from '@/test/intersection-observer';

const SECTIONS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'resume', label: 'Resume' },
];

let observer: FakeIntersectionObserver;

beforeEach(() => {
  observer = installIntersectionObserver();
  document.body.innerHTML = SECTIONS.map((section) => `<div id="${section.id}"></div>`).join('');
});

afterEach(() => {
  observer.restore();
  document.body.innerHTML = '';
});

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

  it('marks nothing as current before the reader has scrolled anywhere', () => {
    render(<ProfileQuickLinks sections={SECTIONS} />);

    expect(screen.queryByRole('link', { current: true })).not.toBeInTheDocument();
  });

  it('marks the section being read as the current one', () => {
    render(<ProfileQuickLinks sections={SECTIONS} />);

    act(() => {
      observer.enter('resume');
    });

    expect(screen.getByRole('link', { current: true })).toHaveAccessibleName('Resume');
  });

  it('moves the marker as the reader scrolls on', () => {
    render(<ProfileQuickLinks sections={SECTIONS} />);

    act(() => {
      observer.enter('personal');
    });
    act(() => {
      observer.enter('resume');
      observer.leave('personal');
    });

    expect(screen.getByRole('link', { current: true })).toHaveAccessibleName('Resume');
  });
});
