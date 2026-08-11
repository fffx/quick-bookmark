import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Single browser mock shared by global.browser and webextension-polyfill
const browser = {
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
};

globalThis.__testBrowser = browser;
global.browser = browser;

global.chrome = {
  runtime: browser.runtime,
};
global.globalThis.chrome = global.chrome;

// Mock webextension-polyfill to return the same browser object used in tests
vi.mock('webextension-polyfill', () => ({
  default: globalThis.__testBrowser,
}));

// Mock navigator.languages
Object.defineProperty(navigator, 'languages', {
  writable: true,
  configurable: true,
  value: ['en-US'],
});

// Mock window.close
global.window.close = vi.fn();
