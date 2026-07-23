import { useEffect, useState } from 'react';

/** Only the top slice of the viewport counts, so "current" means "being read". */
const OBSERVED_BAND = '-96px 0px -65% 0px';

/**
 * Which of the given anchors is currently in view, for a contents list that has to show
 * where the reader is. Uses IntersectionObserver rather than a scroll handler: the
 * browser does the measuring off the main thread, and a long profile scrolls without
 * running a callback per frame.
 *
 * Returns the first section until the reader moves, and an empty string where the
 * observer is unavailable — the list still works, it simply highlights nothing.
 */
export const useActiveSection = (ids: readonly string[]): string => {
  const [activeId, setActiveId] = useState('');
  // The array is rebuilt on every render by most callers; the contents are what matter.
  const key = ids.join(',');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const sectionIds = key === '' ? [] : key.split(',');
    // Tracked across callbacks, because a callback only reports what changed.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }

        // Several sections can be in the band at once, typically the tail of the one
        // being left and the head of the one being entered. The lower of them is the
        // one the reader is moving into, so the marker leads rather than lags.
        setActiveId([...sectionIds].reverse().find((id) => visible.has(id)) ?? '');
      },
      { rootMargin: OBSERVED_BAND },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element !== null) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [key]);

  return activeId;
};
