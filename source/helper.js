/* global setTimeout, clearTimeout, navigator */
import browser from "webextension-polyfill";
import { SEPARATOR} from "./Popup/CategoryItem"
export const filterRecursively = (nodeArray, parentNode, filterFn, results) => {
  results = results || [];
  nodeArray.forEach((node) => {
    // if(node.type == "folder"){
    //     console.log(`processing ------------------------------- node..... `, node.title, node)
    //     console.log(`parentNode..... `, parentNode?.title)
    //     console.log(`titlePrefix `, node.titlePrefix)
    //     console.log(` parentNode titlePrefix `, parentNode?.titlePrefix)
    //     console.log(`children.....`, node.children.map(x => x.title))
    // }
    /* firefox:
       id: "root________", title: "", index: 0, dateAdded: 1679435630057, type: "folder", url: undefined, dateGroupModified: 1758469899045,
          children:  ["Bookmarks Menu", "Bookmarks Toolbar", "Other Bookmarks", "Mobile Bookmarks"]
          ...
      */
    // if (helper.getBrowserName() == "firefox") {
    //     titlePrefix = browser.bookmarks.get(node.parentId).then(node => node.title)
    // }
    if (parentNode?.titlePrefix && parentNode?.title) {
      node.titlePrefix = `${parentNode.titlePrefix}${SEPARATOR}${parentNode.title}`;
    } else if (parentNode?.title) {
      node.titlePrefix = parentNode.title;
    }

    if (filterFn(node)) results.push(node);
    if (node.children)
      filterRecursively(node.children, node, filterFn, results);
  });

  return results;
};

export function debounce(func, wait = 100) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// Cache for getBrowserName to avoid repeated detection
let cachedBrowserName;
export function getBrowserName() {
  if (cachedBrowserName) return cachedBrowserName;

  const ua = navigator.userAgent || "";
  if (ua.includes("Edg/")) {
    cachedBrowserName = "edge";
  } else if (ua.includes("OPR/") || ua.includes("Opera")) {
    cachedBrowserName = "opera";
  } else if (ua.includes("Firefox")) {
    cachedBrowserName = "firefox";
  } else {
    cachedBrowserName = "chrome";
  }
  // console.log("cachedBrowserName ---", cachedBrowserName);
  return cachedBrowserName;
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/getCurrent
export const getCurrentTab = () => {
  return new Promise((resolve) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      resolve(tabs[0]);
    });
  });
};

// TODO: allow user config this behavior?
export const removeHashtag = (url) => url.split("#")[0];

export const isSameBookmarkUrl = (url1, url2) => {
  if (!url1 || !url2) return false;
  // console.log('isSameBookmarkUrl===============', url1, url2, removeHashtag(url1) === removeHashtag(url2))
  return removeHashtag(url1) === removeHashtag(url2);
};

export const sortNodes = (a, b) => {
  if (a.containsCurrentTab && !b.containsCurrentTab) {
    return -1;
  } else if (b.containsCurrentTab && !a.containsCurrentTab) {
    return 1;
  } else {
    return b.dateGroupModified - a.dateGroupModified;
  }
};
