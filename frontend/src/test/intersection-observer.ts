/**
 * A controllable stand-in for IntersectionObserver, which jsdom does not implement.
 * Tests decide what is on screen by calling `enter`/`leave` rather than by scrolling,
 * which nothing in jsdom would report anyway.
 */

export interface FakeIntersectionObserver {
  /** Ids currently being observed, in the order they were registered. */
  readonly observed: readonly string[];
  /** Reports the given elements as entering the observed band. */
  enter(...ids: readonly string[]): void;
  leave(...ids: readonly string[]): void;
  restore(): void;
}

type Callback = (entries: { target: Element; isIntersecting: boolean }[]) => void;

/** Installs the stub on `globalThis` and returns the handle for driving it. */
export const installIntersectionObserver = (): FakeIntersectionObserver => {
  const original = Reflect.get(globalThis, 'IntersectionObserver') as unknown;
  const targets: Element[] = [];
  let notify: Callback = () => undefined;

  class Stub {
    constructor(callback: IntersectionObserverCallback) {
      notify = callback as unknown as Callback;
    }

    observe(element: Element): void {
      targets.push(element);
    }

    disconnect(): void {
      targets.length = 0;
    }

    unobserve(): void {
      /* Nothing here observes one element at a time. */
    }
  }

  Reflect.set(globalThis, 'IntersectionObserver', Stub);

  const report = (ids: readonly string[], isIntersecting: boolean): void => {
    notify(
      targets
        .filter((target) => ids.includes(target.id))
        .map((target) => ({ target, isIntersecting })),
    );
  };

  return {
    get observed() {
      return targets.map((target) => target.id);
    },
    enter: (...ids) => {
      report(ids, true);
    },
    leave: (...ids) => {
      report(ids, false);
    },
    restore: () => {
      Reflect.set(globalThis, 'IntersectionObserver', original);
    },
  };
};
