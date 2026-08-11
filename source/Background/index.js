import "emoji-log";
import browser from "webextension-polyfill";
import { isSameBookmarkUrl } from "../lib/url";
import { collectMatchingNodes } from "../lib/tree";

// show number of bookmark folders containing current tab
let currentTab;
function updateBadge(tab, bookmarks) {
  const text = bookmarks.length > 0 ? `${bookmarks.length}` : "";
  browser.action.setBadgeText({
    tabId: tab.id,
    text: text,
  });
}

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (!tabs[0]) {
      return;
    }
    currentTab = tabs[0];
    browser.bookmarks.getTree().then((bookmarkItems) => {
      const bookmarks = collectMatchingNodes(
        bookmarkItems,
        (node) => node.url && isSameBookmarkUrl(currentTab.url, node.url),
      );
      updateBadge(currentTab, bookmarks);
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
