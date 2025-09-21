import "emoji-log";
import * as helper from "../helper";
import browser from "webextension-polyfill";

// show number of bookmark folders contain current tab
var currentTab;
function updateBadge(currentTab, bookmarks) {
  const text = bookmarks.length > 0 ? `${bookmarks.length}` : "";
  browser.action.setBadgeText({
    tabId: currentTab.id,
    text: text,
  });
}

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab() {
  function updateTab(tabs) {
    // console.log("updateTabs", tabs);
    if (!tabs[0]) {
      return;
    }
    currentTab = tabs[0];
    browser.bookmarks.getTree().then((bookmarkItems) => {
      let bookmarks = [];
      const filter = (node) => {
        if (node.url) {
          helper.isSameBookmarkUrl(currentTab.url, node.url) &&
            bookmarks.push(node);
        } else {
          node.children.forEach((x) => filter(x));
        }
      };
      bookmarkItems.forEach((x) => filter(x));
      updateBadge(currentTab, bookmarks);
    });
  }

  var gettingActiveTab = browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  gettingActiveTab.then(updateTab);
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
