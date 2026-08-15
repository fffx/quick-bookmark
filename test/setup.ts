import "@testing-library/jest-dom";
import { vi } from "vitest";

import type { MockBrowser } from "./globals";

// Single browser mock shared by global.browser and webextension-polyfill
const browser: MockBrowser = {
  action: {
    setBadgeText: vi.fn(),
    setIcon: vi.fn(),
  },
  bookmarks: {
    getTree: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    onCreated: {
      addListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    getCurrent: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
    },
    onActivated: {
      addListener: vi.fn(),
    },
  },
  windows: {
    onFocusChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    id: "test-extension-id",
    getManifest: vi.fn(() => ({})),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
};

globalThis.__testBrowser = browser;
global.browser = browser;

global.chrome = {
  runtime: browser.runtime,
};
global.globalThis.chrome = global.chrome;

// Mock webextension-polyfill to return the same browser object used in tests
vi.mock("webextension-polyfill", () => ({
  default: globalThis.__testBrowser,
}));

// Mock navigator.languages
Object.defineProperty(navigator, "languages", {
  writable: true,
  configurable: true,
  value: ["en-US"],
});

// Mock window.close
global.window.close = vi.fn();
