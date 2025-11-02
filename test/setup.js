import '@testing-library/jest-dom';
import { vi, beforeAll } from 'vitest';

// Set up chrome global BEFORE any imports
beforeAll(() => {
  global.chrome = {
    runtime: {
      id: 'test-extension-id',
      getManifest: vi.fn(() => ({})),
      getURL: vi.fn((path) => `chrome-extension://test/${path}`),
    },
  };

  global.globalThis.chrome = global.chrome;
});

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: {
    bookmarks: {
      getTree: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      get: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
      getCurrent: vi.fn(),
    },
    windows: {
      onFocusChanged: {
        addListener: vi.fn(),
      },
    },
    runtime: {
      id: 'test-extension-id',
      getManifest: vi.fn(() => ({})),
      getURL: vi.fn((path) => `chrome-extension://test/${path}`),
    },
  },
}));

// Set up browser global
global.browser = {
  bookmarks: {
    getTree: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    getCurrent: vi.fn(),
  },
  windows: {
    onFocusChanged: {
      addListener: vi.fn(),
    },
  },
};

// Mock navigator.languages
Object.defineProperty(navigator, 'languages', {
  writable: true,
  configurable: true,
  value: ['en-US'],
});

// Mock window.close
global.window.close = vi.fn();
