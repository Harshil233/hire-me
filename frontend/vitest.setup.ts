import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom implements neither of these, and the UI relies on both.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();

// jsdom has no blob URL support, which the protected-file viewer relies on.
let objectUrlCounter = 0;
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => `blob:mock/${(objectUrlCounter += 1)}`),
});
Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() });

afterEach(() => {
  cleanup();
});
