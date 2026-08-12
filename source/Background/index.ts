import "emoji-log";
import browser from "webextension-polyfill";
import type Browser from "webextension-polyfill";
import { isSameBookmarkUrl } from "../lib/url";
import { collectMatchingNodes } from "../lib/tree";
import type { BookmarkTreeNode } from "../lib/tree";

function updateBadge(
  tab: Browser.Tabs.Tab,
  bookmarks: BookmarkTreeNode[],
): void {
  const text = bookmarks.length > 0 ? `${bookmarks.length}` : "";
  browser.action.setBadgeText({
    tabId: tab.id,
    text: text,
  });
}

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab(): void {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];
    if (!tab) {
      return;
    }
    browser.bookmarks.getTree().then((bookmarkItems) => {
      const bookmarks = collectMatchingNodes(bookmarkItems, (node) =>
        isSameBookmarkUrl(tab.url, node.url),
      );
      updateBadge(tab, bookmarks);
    });
  });
}

// listen for bookmarks being created
browser.bookmarks.onCreated.addListener(updateActiveTab);

// listen for bookmarks being removed
browser.bookmarks.onRemoved.addListener(updateActiveTab);

// listen to tab URL changes
browser.tabs.onUpdated.addListener(updateActiveTab);

// listen to tab switching
browser.tabs.onActivated.addListener(updateActiveTab);

// listen for window switching
browser.windows.onFocusChanged.addListener(updateActiveTab);

// update when the extension loads initially
updateActiveTab();
