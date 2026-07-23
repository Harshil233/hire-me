import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useActiveSection } from '../useActiveSection';
import {
  installIntersectionObserver,
  type FakeIntersectionObserver,
} from '@/test/intersection-observer';

const IDS = ['personal', 'resume', 'education'];

let observer: FakeIntersectionObserver;

const givenSectionsExist = (): void => {
  document.body.innerHTML = IDS.map((id) => `<div id="${id}"></div>`).join('');
};

beforeEach(() => {
  observer = installIntersectionObserver();
  givenSectionsExist();
});

afterEach(() => {
  observer.restore();
  document.body.innerHTML = '';
});

describe('useActiveSection', () => {
  it('watches every section it is given that exists on the page', () => {
    renderHook(() => useActiveSection(IDS));

    expect(observer.observed).toEqual(IDS);
  });

  it('skips an id with no element behind it', () => {
    renderHook(() => useActiveSection([...IDS, 'nothing-here']));

    expect(observer.observed).toEqual(IDS);
  });

  it('reports nothing before anything has come into view', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('');
  });

  it('reports the section that came into view', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => {
      observer.enter('resume');
    });

    expect(result.current).toBe('resume');
  });

  it('prefers the lower section when several are in view at once', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => {
      observer.enter('education', 'personal');
    });

    // Document order decides, not the order the browser happened to report them in:
    // the one being scrolled into wins over the tail of the one being left behind.
    expect(result.current).toBe('education');
  });

  it('falls back to the section still in view when the lower one scrolls out', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => {
      observer.enter('personal', 'resume');
    });
    act(() => {
      observer.leave('resume');
    });

    expect(result.current).toBe('personal');
  });

  it('reports nothing once every section has scrolled out', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => {
      observer.enter('resume');
    });
    act(() => {
      observer.leave('resume');
    });

    expect(result.current).toBe('');
  });

  it('stays quiet where the browser has no IntersectionObserver', () => {
    observer.restore();
    Reflect.deleteProperty(globalThis, 'IntersectionObserver');

    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('');
  });

  it('observes nothing when given no sections', () => {
    const { result } = renderHook(() => useActiveSection([]));

    expect(observer.observed).toEqual([]);
    expect(result.current).toBe('');
  });
});
