import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();

  if (!window.crypto.randomUUID) {
    Object.defineProperty(window.crypto, 'randomUUID', {
      value: vi.fn(() => '00000000-0000-4000-8000-000000000000'),
      configurable: true,
    });
  }

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia =
    window.matchMedia ||
    vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
});

afterEach(() => {
  cleanup();
});
