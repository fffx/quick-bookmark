import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import "../source/Background/index";

// Listener registrations happen as import side effects; capture them before
// beforeEach resets the mocks.
const updateActiveTab =
  global.browser.bookmarks.onCreated.addListener.mock.calls[0][0];

const registered = {
  onCreated:
    global.browser.bookmarks.onCreated.addListener.mock.calls.length > 0,
  onRemoved:
    global.browser.bookmarks.onRemoved.addListener.mock.calls.length > 0,
  tabsUpdated: global.browser.tabs.onUpdated.addListener.mock.calls.length > 0,
  tabsActivated:
    global.browser.tabs.onActivated.addListener.mock.calls.length > 0,
  windowsFocusChanged:
    global.browser.windows.onFocusChanged.addListener.mock.calls.length > 0,
};

describe("Background service worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers listeners for bookmark and tab changes", () => {
    expect(registered.onCreated).toBe(true);
    expect(registered.onRemoved).toBe(true);
    expect(registered.tabsUpdated).toBe(true);
    expect(registered.tabsActivated).toBe(true);
    expect(registered.windowsFocusChanged).toBe(true);
  });

  it("sets badge to the count of bookmarks matching the active tab", async () => {
    global.browser.tabs.query.mockResolvedValue([
      { id: 7, url: "https://github.com" },
    ]);
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              {
                id: "2",
                title: "Development",
                children: [
                  { id: "3", title: "GitHub", url: "https://github.com" },
                  { id: "4", title: "Other", url: "https://other.com" },
                ],
              },
            ],
          },
        ],
      },
    ]);

    updateActiveTab();

    await waitFor(() => {
      expect(global.browser.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 7,
        text: "1",
      });
      expect(global.browser.action.setIcon).toHaveBeenCalledWith({
        tabId: 7,
        path: {
          16: "chrome-extension://test/assets/icons/bookmark-filled-16.png",
          32: "chrome-extension://test/assets/icons/bookmark-filled-32.png",
          48: "chrome-extension://test/assets/icons/bookmark-filled-48.png",
          128: "chrome-extension://test/assets/icons/bookmark-filled-128.png",
        },
      });
    });
  });

  it("clears the badge when the active tab has no matching bookmarks", async () => {
    global.browser.tabs.query.mockResolvedValue([
      { id: 7, url: "https://nomatch.com" },
    ]);
    global.browser.bookmarks.getTree.mockResolvedValue([
      { id: "0", children: [] },
    ]);

    updateActiveTab();

    await waitFor(() => {
      expect(global.browser.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 7,
        text: "",
      });
      expect(global.browser.action.setIcon).toHaveBeenCalledWith({
        tabId: 7,
        path: {
          16: "chrome-extension://test/assets/icons/bookmark-16.png",
          32: "chrome-extension://test/assets/icons/bookmark-32.png",
          48: "chrome-extension://test/assets/icons/bookmark-48.png",
          128: "chrome-extension://test/assets/icons/bookmark-128.png",
        },
      });
    });
  });

  it("does nothing when there is no active tab", async () => {
    global.browser.tabs.query.mockResolvedValue([]);

    updateActiveTab();
    await Promise.resolve();

    expect(global.browser.action.setBadgeText).not.toHaveBeenCalled();
  });
});
