import { vi } from 'vitest';

// Mock webextension-polyfill module
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

export default browser;
