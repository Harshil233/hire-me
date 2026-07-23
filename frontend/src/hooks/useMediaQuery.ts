import { useEffect, useState } from 'react';

/**
 * Tracks a media query in JavaScript, for the cases CSS cannot cover: when wide and
 * narrow layouts need *different markup* rather than different styling. Filters are the
 * example — rendering both a sidebar and a drawer and hiding one would put two copies of
 * every control in the document, which is wrong for assistive technology as much as for
 * the eye.
 *
 * Answers `false` where `matchMedia` is unavailable, so a server or a test environment
 * gets the narrow layout rather than a crash.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    list.addEventListener('change', onChange);
    return () => {
      list.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
};

/** The breakpoint at which a list screen has room for a filter rail beside it. */
export const useIsWideScreen = (): boolean => useMediaQuery('(min-width: 1024px)');
