import type { Mock } from "vitest";

export interface MockBrowser {
  action: {
    setBadgeText: Mock;
  };
  bookmarks: {
    getTree: Mock;
    create: Mock;
    remove: Mock;
    get: Mock;
    onCreated: {
      addListener: Mock;
    };
    onRemoved: {
      addListener: Mock;
    };
  };
  tabs: {
    query: Mock;
    getCurrent: Mock;
    onUpdated: {
      addListener: Mock;
    };
    onActivated: {
      addListener: Mock;
    };
  };
  windows: {
    onFocusChanged: {
      addListener: Mock;
    };
  };
  runtime: {
    id: string;
    getManifest: Mock;
    getURL: Mock;
  };
}

declare global {
  var browser: MockBrowser;
  var chrome: { runtime: MockBrowser["runtime"] };
  var __testBrowser: MockBrowser;
}

export {};
